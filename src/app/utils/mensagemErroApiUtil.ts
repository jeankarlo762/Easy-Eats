import { HttpErrorResponse } from '@angular/common/http';

export class MensagemErroApiUtil {
  /**
   * Extrai a mensagem amigável retornada pelo GlobalExceptionHandler do
   * backend, que responde no formato `{ erro: "...", campos?: ["campo: msg"] }`.
   * Cai para um texto genérico quando a resposta não tem esse formato.
   *
   * @param erro Erro capturado no `error:` de um subscribe de HttpClient.
   * @param fallback Mensagem a usar quando o backend não informar uma.
   */
  static extrair = (erro: unknown, fallback: string): string => {
    if (!(erro instanceof HttpErrorResponse)) {
      return fallback;
    }

    if (erro.status === 0) {
      return 'Não foi possível conectar ao servidor. Verifique se a API está em execução.';
    }

    const corpo = MensagemErroApiUtil.corpo(erro.error);
    const mensagem = corpo?.['erro'] ?? corpo?.['mensagem'] ?? corpo?.['message'];
    const campos = Array.isArray(corpo?.['campos']) ? (corpo['campos'] as string[]) : [];

    if (typeof mensagem === 'string' && mensagem.trim().length > 0) {
      return campos.length ? `${mensagem}: ${campos.join('; ')}` : mensagem;
    }

    return fallback;
  };

  private static corpo(valor: unknown): Record<string, unknown> | null {
    if (valor && typeof valor === 'object') {
      return valor as Record<string, unknown>;
    }
    if (typeof valor === 'string') {
      try {
        const convertido = JSON.parse(valor);
        return convertido && typeof convertido === 'object' ? convertido : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}
