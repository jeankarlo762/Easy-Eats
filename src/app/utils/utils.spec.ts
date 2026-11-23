import { HttpErrorResponse } from '@angular/common/http';
import { perfilDasRoles } from '../auth/auth.service';
import { MensagemErroApiUtil } from './mensagemErroApiUtil';
import { PeriodoUtil } from './periodoUtil';

describe('MensagemErroApiUtil', () => {
  it('lê o campo "erro" retornado pelo GlobalExceptionHandler', () => {
    const erro = new HttpErrorResponse({ status: 422, error: { erro: 'Estoque insuficiente de Pão' } });
    expect(MensagemErroApiUtil.extrair(erro, 'fallback')).toBe('Estoque insuficiente de Pão');
  });

  it('inclui os campos inválidos da validação', () => {
    const erro = new HttpErrorResponse({
      status: 400,
      error: { erro: 'Dados inválidos', campos: ['nome: O nome é obrigatório'] },
    });
    expect(MensagemErroApiUtil.extrair(erro, 'fallback')).toBe('Dados inválidos: nome: O nome é obrigatório');
  });

  it('avisa quando o servidor está fora do ar', () => {
    const erro = new HttpErrorResponse({ status: 0 });
    expect(MensagemErroApiUtil.extrair(erro, 'fallback')).toContain('conectar ao servidor');
  });

  it('usa o fallback quando não há mensagem', () => {
    expect(MensagemErroApiUtil.extrair(new HttpErrorResponse({ status: 500 }), 'fallback')).toBe('fallback');
  });
});

describe('perfilDasRoles', () => {
  it('mapeia as roles do backend para o perfil de maior privilégio', () => {
    expect(perfilDasRoles(['ROLE_FUNCIONARIO', 'ROLE_ADMIN'])).toBe('ADMINISTRADOR');
    expect(perfilDasRoles(['ROLE_GERENTE'])).toBe('GERENTE');
    expect(perfilDasRoles(['ROLE_FUNCIONARIO'])).toBe('FUNCIONARIO');
    expect(perfilDasRoles([])).toBe('FUNCIONARIO');
  });
});

describe('PeriodoUtil', () => {
  it('formata a data local (sem converter para UTC)', () => {
    expect(PeriodoUtil.paraIso(new Date(2026, 10, 5, 23, 30))).toBe('2026-11-05');
  });

  it('resolve "semana" como os últimos 7 dias incluindo hoje', () => {
    const { inicio, fim } = PeriodoUtil.resolver('semana');
    const dias = (new Date(`${fim}T00:00:00`).getTime() - new Date(`${inicio}T00:00:00`).getTime()) / 86400000;
    expect(Math.round(dias)).toBe(6);
  });
});
