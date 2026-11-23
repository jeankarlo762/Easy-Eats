# Integração frontend Easy-Eats com o backend Spring Boot (Easy-Eats-Api-2)

## URL da API

- `src/environments/environment.ts`: `http://localhost:8080` (o backend não declara context-path).
- O `ng serve` roda na porta **5173** (`angular.json`), que está liberada no CORS do backend junto com 4200.
- Para acessar de outro computador/celular, troque `localhost` pelo IP da máquina do backend.

## Telas e endpoints

| Tela (rota) | Perfis | Endpoints usados |
| --- | --- | --- |
| Login (`/login`) | — | `POST /auth/login` (form-urlencoded, devolve o JWT como texto) |
| Início (`/home`) | todos | `GET /pedido` |
| Mesas (`/mesas`) | todos (cadastro: Admin/Gerente) | `GET /vendas/ocupacao-mesas` (ocupação), `GET /vendas/abertas` (retiradas em aberto), `POST/PUT/DELETE /mesa` |
| Novo Pedido (`/novo-pedido`) | todos | `GET /produto`, `GET /categorias`, `GET /mesa`, `POST /pedido` (mesa ou retirada), `POST /vendas/{id}/pagamentos`, `POST /vendas/{id}/finalizar`, `GET /caixa/atual` |
| Histórico (`/historico-vendas`) | todos | `GET /pedido`, `PATCH /pedido/{id}/status/{status}` |
| Fila da Cozinha (`/fila`) | todos | `GET /pedido`, `PATCH /pedido/{id}/status/{status}` |
| Tela Cozinha (`/tela-cozinha`) | todos | `GET /pedido`, `PATCH /pedido/{id}/status/{status}` |
| Meu Perfil (`/perfil`) | todos | dados do token JWT |
| Dashboard (`/dashboard`) | Admin/Gerente | `GET /pedido`, `GET /estoques/alertas`, `GET /vendas/resumo` (faturamento) |
| Relatório de Pedidos / da Cozinha | Admin/Gerente | `GET /pedido` (cálculo no front) |
| Ingredientes e Estoque (`/controle-estoque`) | Admin/Gerente | `/ingredientes` (CRUD), `/estoques` (POST, PUT mínimo, PATCH `/entrada` e `/saida`) |
| Relatório de Estoque | Admin/Gerente | `GET /ingredientes`, `GET /estoques` |
| Catálogo (`/cadastro-produto`) | Admin/Gerente | `/produto` (CRUD), `GET /categorias` |
| Categorias (`/categorias`) | Admin/Gerente | `GET/POST/PUT /categorias`, `PATCH /categorias/{id}/inativar` |
| Ficha Técnica (`/ficha-tecnica`) | Admin/Gerente | `GET/POST/DELETE /produto-ingrediente`, `GET /produto`, `GET /ingredientes` |
| Financeiro (`/financeiro`) | Admin/Gerente | `GET /vendas/resumo`, `GET /vendas?status=FINALIZADA`, `GET /vendas/abertas` (faturamento = vendas finalizadas) |
| Usuários (`/usuarios`) | Admin | `GET/POST /usuarios` |
| Conta da mesa ou retirada (`/conta/:id`) | todos (cancelar: Admin/Gerente) | `GET /vendas/{id}`, `POST /vendas/{id}/pagamentos`, `DELETE /vendas/{id}/pagamentos/{id}`, `POST /vendas/{id}/finalizar`, `POST /vendas/{id}/cancelar` |
| Caixa (`/caixa`) | todos (sangria e fechamento: Admin/Gerente) | `GET /caixa/atual`, `POST /caixa/abrir`, `POST /caixa/{id}/movimentacoes`, `POST /caixa/{id}/fechar`, `GET /caixa/movimentacoes` |
| Histórico de Caixas (`/caixa-historico`) | Admin/Gerente | `GET /caixa` |
| Relatório de Fechamento (`/caixa-relatorio/:id`) | Admin/Gerente | `GET /caixa/{id}/relatorio-fechamento` |
| Lançamentos do Caixa (`/gestao-financeira`) | Admin/Gerente | `GET /caixa/movimentacoes`, `GET /caixa/movimentacoes/resumo` |

## Perfis

O backend tem as roles `ADMIN`, `GERENTE` e `FUNCIONARIO` (o token traz `ROLE_*`). O front usa o de maior privilégio:
Administrador (tudo), Gerente (tudo menos Usuários) e Funcionário (mesas, pedidos, cozinha e abertura de caixa com suprimento).
O controle por perfil é só no front, exceto no Caixa: a API de `/caixa` valida o perfil (sangria, fechamento e consultas exigem Administrador ou Gerente; abrir, ver o caixa atual e lançar suprimento valem para qualquer usuário). Nas demais rotas a API aceita qualquer usuário autenticado.

## Venda e comanda
O `Pedido` do backend é a **comanda** (vai para a cozinha); a **venda** é a conta (`/vendas`): agrupa as comandas,
recebe os pagamentos e só libera a mesa ao ser finalizada ou cancelada. A venda abre sozinha na primeira
comanda da mesa. Tipos: `MESA`, `RETIRADA` (sem mesa, identificada pelo nome do cliente) e `DELIVERY` (ainda
indisponível, o frontend mostra "Em breve"). Finalizar exige o total pago igual ao total da venda e **caixa
aberto**. No frontend o modelo da comanda é `Comanda`/`ComandaService` (`src/app/comandas`) e o da venda é
`Venda`/`VendaService` (`src/app/vendas`).

## Status do pedido

O front usa o enum do backend: `ABERTO` (Aguardando) → `EM_PREPARO` (baixa o estoque pela ficha técnica) → `FINALIZADO`; `CANCELADO` a qualquer momento antes de finalizar.

## Comportamentos do backend que o front contorna

- `GET /mesa` e `GET /pedido` respondem **204 sem corpo** quando a lista está vazia — tratado como lista vazia.
- Erros tratados pelo `GlobalExceptionHandler` vêm como `{ "erro": "...", "campos": [...] }` e são exibidos na tela.
- Exceções não tratadas (ex.: `RuntimeException`, `ResponseStatusException`) são encaminhadas pelo Spring para `/error`, que exige autenticação, e chegam ao front como **403**. Por isso o front só encerra a sessão em 403 quando o token realmente expirou.
- `abaixoDoMinimo` do estoque é `qtdAtual <= qtdMinima` (inclui "igual ao mínimo").

## Telas sem API (fora das rotas)

Comandas, clientes, fidelidade, cupons/cashback, fornecedores, pedidos de compra,
cardápio digital, grupos de acesso, configurações, confirmar pedido, delivery e o painel superadmin
continuam no projeto, mas não estão no menu nem nas rotas até o backend expor os endpoints.

## Observação técnica

O app é Angular 21 **zoneless** (sem zone.js). O estado exibido nas telas fica em `signal()`; alterar
uma propriedade comum dentro de um `subscribe` não atualiza a tela.
