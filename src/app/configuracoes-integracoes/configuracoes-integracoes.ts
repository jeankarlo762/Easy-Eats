import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type ChaveIntegracao = 'mercadopago' | 'ifood' | 'whatsapp' | 'impressora';

interface PassoIntegracao {
  texto: string;
}

interface Integracao {
  chave: ChaveIntegracao;
  nome: string;
  icone: string;
  descricao: string;
  ativo: boolean;
  passos: PassoIntegracao[];
}

@Component({
  selector: 'app-configuracoes-integracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracoes-integracoes.html',
  styleUrl: './configuracoes-integracoes.scss',
})
export class ConfiguracoesIntegracoes {
  abaAtiva: ChaveIntegracao = 'mercadopago';

  credenciais = {
    mercadopago: { accessToken: '', publicKey: '' },
    ifood: { clientId: '', clientSecret: '', merchantId: '' },
    whatsapp: { phoneNumberId: '', accessToken: '', numero: '' },
    impressora: { modelo: 'rede', ip: '', porta: '9100' },
  };

  readonly integracoes: Integracao[] = [
    {
      chave: 'mercadopago',
      nome: 'Mercado Pago / PIX',
      icone: 'bi-credit-card',
      descricao: 'Cobrança e conciliação automática de pagamentos via PIX e cartão.',
      ativo: false,
      passos: [
        { texto: 'Crie uma conta de desenvolvedor em mercadopago.com.br/developers.' },
        { texto: 'Crie uma aplicação e copie o Access Token de produção.' },
        { texto: 'Cole o Access Token e a Public Key abaixo e salve.' },
        { texto: 'Os pagamentos passam a ser recebidos e conciliados automaticamente pelo sistema.' },
      ],
    },
    {
      chave: 'ifood',
      nome: 'iFood',
      icone: 'bi-bag-check',
      descricao: 'Recebimento automático, dentro do Easy Eats, dos pedidos feitos no app do iFood.',
      ativo: true,
      passos: [
        { texto: 'Cadastre-se no Portal do Parceiro iFood (developer.ifood.com.br).' },
        { texto: 'Solicite acesso à API de Pedidos — essa integração exige homologação prévia com o iFood, não é imediata.' },
        { texto: 'Após aprovado, gere o Client ID e o Client Secret da sua aplicação.' },
        { texto: 'Informe também o Merchant ID (identificador da sua loja no iFood) abaixo.' },
      ],
    },
    {
      chave: 'whatsapp',
      nome: 'WhatsApp Business',
      icone: 'bi-whatsapp',
      descricao: 'Envio automático de notificações de status do pedido para o cliente.',
      ativo: true,
      passos: [
        { texto: 'Crie um app em developers.facebook.com (Meta for Developers).' },
        { texto: 'Ative o produto "WhatsApp Business Platform" dentro do app.' },
        { texto: 'Verifique seu número de telefone comercial no painel da Meta.' },
        { texto: 'Copie o Phone Number ID e gere um token de acesso permanente para colar abaixo.' },
      ],
    },
    {
      chave: 'impressora',
      nome: 'Impressora de Cozinha',
      icone: 'bi-printer',
      descricao: 'Impressão automática de comandas assim que o pedido é confirmado.',
      ativo: false,
      passos: [
        { texto: 'Impressora em rede (ex.: Epson com Ethernet): informe o IP e a porta — o sistema usa a API ePOS-Print direto pela rede.' },
        { texto: 'Impressora USB ou Bluetooth: o navegador não acessa a porta diretamente — é necessário instalar um pequeno agente local no computador da cozinha para receber os comandos de impressão.' },
        { texto: 'Depois de configurada, use "Testar Conexão" para imprimir um cupom de teste.' },
      ],
    },
  ];

  get integracaoAtiva(): Integracao {
    return this.integracoes.find((i) => i.chave === this.abaAtiva)!;
  }

  selecionarAba(chave: ChaveIntegracao) {
    this.abaAtiva = chave;
  }

  alternarAtivo(integracao: Integracao) {
    integracao.ativo = !integracao.ativo;
  }

  salvar(integracao: Integracao) {
    console.log(`Configuração salva para ${integracao.nome}:`, this.credenciais[integracao.chave]);
    alert(`Configurações de "${integracao.nome}" salvas com sucesso!`);
  }

  testarConexao(integracao: Integracao) {
    alert(`Não há credenciais reais configuradas ainda — conecte "${integracao.nome}" com uma conta de verdade para testar.`);
  }
}
