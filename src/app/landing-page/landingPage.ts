import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PreviewCozinha } from '../../components/preview-cozinha/preview-cozinha';
import { ThemeService } from '../theme/theme.service';

interface Modulo {
  icone: string;
  cor: string;
  titulo: string;
  descricao: string;
}

interface MarcoOrigem {
  data: string;
  titulo: string;
  descricao: string;
}

interface Integrante {
  nome: string;
  iniciais: string;
  contribuicao: string;
  areas: string[];
  commits: number;
}

/**
 * Página pública de apresentação do Easy Eats.
 *
 * Fica fora do layout autenticado (não usa AppLayout nem sidebar) e não passa
 * pelo authGuard — é a vitrine do projeto, acessível sem login em
 * /landing-page. Reaproveita os tokens de cor do styles.scss e o ThemeService
 * do app, então acompanha o modo claro/escuro escolhido pelo usuário.
 *
 * Todos os números e datas abaixo vêm do histórico real dos dois repositórios
 * (Easy-Eats e Easy-Eats-Api), não são estimativas.
 */
@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PreviewCozinha],
  templateUrl: './landingPage.html',
  styleUrl: './landingPage.scss',
})
export class LandingPage {
  protected themeService = inject(ThemeService);

  anoAtual = new Date().getFullYear();

  numeros = [
    { valor: '111', rotulo: 'endpoints REST' },
    { valor: '46', rotulo: 'telas no sistema' },
    { valor: '13', rotulo: 'módulos configuráveis' },
    { valor: '208', rotulo: 'commits' },
  ];

  // Espelha o enum Funcionalidade do backend, que define quais módulos cada
  // segmento de negócio habilita para a empresa.
  modulos: Modulo[] = [
    {
      icone: 'bi-grid-3x3-gap',
      cor: '#7c3aed',
      titulo: 'Mesas e comandas',
      descricao:
        'O garçom abre a comanda direto na mesa, lança rodadas de pedido ao longo da visita e fecha tudo em um pagamento só. A mesa volta para livre automaticamente.',
    },
    {
      icone: 'bi-cart3',
      cor: '#ea580c',
      titulo: 'Pedido com customização',
      descricao:
        'Monte o item retirando o que o cliente não quer da composição, somando adicionais e registrando observações. O preço acompanha a escolha em tempo real.',
    },
    {
      icone: 'bi-egg-fried',
      cor: '#d97706',
      titulo: 'Tela de cozinha',
      descricao:
        'Painel que atualiza sozinho a cada 10 segundos, separando os pedidos em Aguardando, Preparando e Pronto — com os itens removidos e adicionais destacados.',
    },
    {
      icone: 'bi-cash-stack',
      cor: '#16a34a',
      titulo: 'Frente de caixa',
      descricao:
        'Abertura e fechamento de caixa com sangria e suprimento. No fechamento o sistema confere o valor apurado com o informado e registra a diferença.',
    },
    {
      icone: 'bi-basket3',
      cor: '#4f46e5',
      titulo: 'Produtos e cardápio',
      descricao:
        'Catálogo com composição, adicionais e ficha técnica. Um mesmo produto pode aparecer em vários cardápios com preço, foto e descrição próprios.',
    },
    {
      icone: 'bi-ticket-perforated',
      cor: '#0d9488',
      titulo: 'Cupons e cashback',
      descricao:
        'Cupons percentuais ou de valor fixo, com validade, valor mínimo e limite de uso por cliente. Cashback configurável por empresa.',
    },
    {
      icone: 'bi-box-seam',
      cor: '#16a34a',
      titulo: 'Estoque e compras',
      descricao:
        'Controle de insumos com busca em árvore binária, cadastro de fornecedores e pedidos de compra ligados à ficha técnica dos produtos.',
    },
    {
      icone: 'bi-shield-lock',
      cor: '#dc2626',
      titulo: 'Acesso por perfil',
      descricao:
        'Cinco perfis — superadmin, administrador, operador, garçom e cozinheiro — com autenticação JWT e permissões validadas no backend, não só na tela.',
    },
  ];

  // Datas extraídas do histórico do Git dos dois repositórios.
  linhaDoTempo: MarcoOrigem[] = [
    {
      data: 'Março de 2026',
      titulo: 'O primeiro commit',
      descricao:
        'O projeto nasce como um front-end Angular. Em uma semana já existiam as telas de login e cadastro, e a identidade laranja que o sistema mantém até hoje.',
    },
    {
      data: 'Abril de 2026',
      titulo: 'As telas do dia a dia',
      descricao:
        'Chegam a fila da cozinha, o novo pedido, o dashboard, o histórico de vendas e os perfis de administrador e garçom — cada um em uma branch de feature, revisado por pull request.',
    },
    {
      data: 'Maio de 2026',
      titulo: 'Padronização visual',
      descricao:
        'Duas rodadas de refatoração unificam espaçamentos, cores e componentes de formulário. É quando o Easy Eats deixa de ser um conjunto de telas e vira um produto coeso.',
    },
    {
      data: 'Junho de 2026',
      titulo: 'A API entra em cena',
      descricao:
        'Começa o backend em Spring Boot, organizado em módulos por domínio com repositório, service e controller. As telas passam a consumir dados de verdade, vindos do PostgreSQL.',
    },
    {
      data: 'Julho de 2026',
      titulo: 'Segurança e multiempresa',
      descricao:
        'Autenticação JWT, controle de acesso por perfil e o conceito de segmento de negócio: cada empresa enxerga apenas os módulos que fazem sentido para ela.',
    },
    {
      data: 'Agosto de 2026',
      titulo: 'O fluxo completo do salão',
      descricao:
        'Comandas, mesas, frente de caixa, cardápio digital e cupons fecham o ciclo — do momento em que o cliente senta até o pagamento e a liberação da mesa.',
    },
  ];

  // Contribuições apuradas pelos commits de cada pessoa nos dois repositórios.
  integrantes: Integrante[] = [
    {
      nome: 'João Vitor Batista',
      iniciais: 'JV',
      contribuicao: 'Fundou o repositório e construiu boa parte das telas do núcleo operacional.',
      areas: ['Login e cadastro', 'Novo pedido', 'Dashboard', 'Roteamento'],
      commits: 116,
    },
    {
      nome: 'Isaque M. Lopes',
      iniciais: 'IL',
      contribuicao: 'Desenhou a estrutura MVC da API e modelou os domínios centrais.',
      areas: ['Arquitetura da API', 'Venda e item de venda', 'Empresa e cliente', 'Cardápio'],
      commits: 38,
    },
    {
      nome: 'Pedro Henrique de Araujo Rocha',
      iniciais: 'PR',
      contribuicao: 'Trabalhou no caminho que o pedido percorre até a cozinha.',
      areas: ['Novo pedido', 'Fila da cozinha', 'Confirmação de pedido', 'Histórico'],
      commits: 20,
    },
    {
      nome: 'Lucas Mendes Koch',
      iniciais: 'LK',
      contribuicao: 'Cuidou da fila, do estoque e do cadastro de produtos nas duas pontas.',
      areas: ['Fila da cozinha', 'Controle de estoque', 'Cadastro de produto', 'Cardápio'],
      commits: 19,
    },
    {
      nome: 'Jean Karlo May Kessler',
      iniciais: 'JK',
      contribuicao: 'Implementou a camada de segurança e a integração ponta a ponta.',
      areas: ['Autenticação e RBAC', 'Multiempresa e segmentos', 'Comandas e caixa', 'Tratamento de erros'],
      commits: 11,
    },
    {
      nome: 'Douglas Matos',
      iniciais: 'DM',
      contribuicao: 'Contribuiu com o módulo financeiro e o histórico de vendas.',
      areas: ['Financeiro', 'Histórico de vendas'],
      commits: 4,
    },
  ];

  tecnologias = [
    { nome: 'Angular 21', detalhe: 'standalone components e signals' },
    { nome: 'Spring Boot 4', detalhe: 'API REST modular por domínio' },
    { nome: 'PostgreSQL 17', detalhe: 'persistência via Spring Data JPA' },
    { nome: 'JWT', detalhe: 'autenticação stateless' },
    { nome: 'TypeScript', detalhe: 'modo estrito ponta a ponta' },
    { nome: 'OpenAPI', detalhe: 'documentação viva da API' },
  ];

  irPara(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
