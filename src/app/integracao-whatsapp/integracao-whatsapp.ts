import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import QRCode from 'qrcode';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { FormatarTelefoneUtil } from '../utils/formatarTelefoneUtil';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { ConexaoWhatsapp, WhatsappService } from './whatsapp.service';

const INTERVALO_MS = 4000;

/**
 * Conecta o número de WhatsApp da loja (como no WhatsApp Web): mostra o QR Code gerado pelo gateway Baileys e
 * acompanha a conexão. É esse número que envia a confirmação para o cliente que pede pelo cardápio digital.
 */
@Component({
  selector: 'app-integracao-whatsapp',
  standalone: true,
  imports: [FormsModule, CarregandoComponent],
  templateUrl: './integracao-whatsapp.html',
  styleUrls: ['./integracao-whatsapp.scss'],
})
export class IntegracaoWhatsapp implements OnInit, OnDestroy {
  private service = inject(WhatsappService);
  private timer: ReturnType<typeof setInterval> | null = null;
  private ultimoQr: string | null = null;

  conexao = signal<ConexaoWhatsapp | null>(null);
  qrImagem = signal<string | null>(null);
  carregando = signal(true);
  erro = signal<string | null>(null);
  processando = signal(false);
  telefoneTeste = '';
  resultadoTeste = signal<{ ok: boolean; mensagem: string } | null>(null);

  ngOnInit(): void {
    this.atualizar();
    this.timer = setInterval(() => this.atualizar(), INTERVALO_MS);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  atualizar(): void {
    this.service.conexao().subscribe({
      next: (conexao) => this.aplicar(conexao),
      error: (erro: unknown) => {
        // 502: a API respondeu, mas o gateway está fora do ar
        if (erro instanceof HttpErrorResponse && erro.status === 502 && erro.error?.status) {
          this.aplicar(erro.error as ConexaoWhatsapp);
          return;
        }
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível consultar o WhatsApp.'));
        this.carregando.set(false);
      },
    });
  }

  private aplicar(conexao: ConexaoWhatsapp): void {
    this.conexao.set(conexao);
    this.carregando.set(false);
    this.erro.set(null);
    const qr = conexao.status === 'conectado' ? null : (conexao.qr ?? null);
    if (qr === this.ultimoQr) return;
    this.ultimoQr = qr;
    if (!qr) {
      this.qrImagem.set(null);
      return;
    }
    QRCode.toDataURL(qr, { width: 320, margin: 2 })
      .then((imagem) => this.qrImagem.set(imagem))
      .catch(() => this.qrImagem.set(null));
  }

  desconectar(): void {
    if (this.processando()) return;
    this.processando.set(true);
    this.service.desconectar().subscribe({
      next: () => {
        this.processando.set(false);
        this.atualizar();
      },
      error: (erro) => {
        this.processando.set(false);
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível desconectar.'));
      },
    });
  }

  formatarTelefone(valor: string): void {
    this.telefoneTeste = FormatarTelefoneUtil.formatar(valor ?? '');
  }

  testar(): void {
    const digitos = this.telefoneTeste.replace(/\D/g, '');
    if (digitos.length < 10) {
      this.resultadoTeste.set({ ok: false, mensagem: 'Informe um WhatsApp com DDD.' });
      return;
    }
    this.processando.set(true);
    this.resultadoTeste.set(null);
    this.service.testar(digitos).subscribe({
      next: () => {
        this.processando.set(false);
        this.resultadoTeste.set({ ok: true, mensagem: 'Mensagem de teste enviada.' });
      },
      error: (erro) => {
        this.processando.set(false);
        const detalhe = erro instanceof HttpErrorResponse ? erro.error?.erro : null;
        this.resultadoTeste.set({ ok: false, mensagem: detalhe || 'Não foi possível enviar o teste.' });
      },
    });
  }

  formatarNumero(numero: string | null | undefined): string {
    if (!numero) return '';
    const local = numero.startsWith('55') ? numero.slice(2) : numero;
    return FormatarTelefoneUtil.formatar(local);
  }
}
