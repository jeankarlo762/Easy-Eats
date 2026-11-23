import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface UsoMasterKey {
  data: string;
  acao: string;
  ip: string;
}

@Component({
  selector: 'app-superadmin-configuracoes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './superadmin-configuracoes.html',
  styleUrl: './superadmin-configuracoes.scss',
})
export class SuperadminConfiguracoes {
  masterKey = this.gerarChave();
  chaveVisivel = false;
  ultimaGeracao = '28/07/2026 às 14:32';
  copiado = false;

  readonly historicoUso: UsoMasterKey[] = [
    { data: '28/07/2026 09:14', acao: 'Acesso de suporte — Burger House Ltda', ip: '203.0.113.42' },
    { data: '25/07/2026 17:02', acao: 'Acesso de suporte — Pizzaria Bella Napoli', ip: '203.0.113.19' },
    { data: '20/07/2026 11:47', acao: 'Chave regenerada pelo Superadmin', ip: '203.0.113.7' },
  ];

  get chaveExibida(): string {
    if (this.chaveVisivel) {
      return this.masterKey;
    }
    return this.masterKey.slice(0, 8) + '••••••••••••••••' + this.masterKey.slice(-4);
  }

  alternarVisibilidade() {
    this.chaveVisivel = !this.chaveVisivel;
  }

  copiarChave() {
    navigator.clipboard?.writeText(this.masterKey);
    this.copiado = true;
    setTimeout(() => (this.copiado = false), 2000);
  }

  regenerarChave() {
    const confirmar = confirm(
      'Ao gerar uma nova chave mestra, a chave atual deixa de funcionar imediatamente. Deseja continuar?',
    );
    if (!confirmar) return;

    this.masterKey = this.gerarChave();
    this.chaveVisivel = true;
    this.ultimaGeracao = new Date().toLocaleString('pt-BR');
  }

  private gerarChave(): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let sufixo = '';
    for (let i = 0; i < 32; i++) {
      sufixo += caracteres[Math.floor(Math.random() * caracteres.length)];
    }
    return `sk_master_${sufixo}`;
  }
}
