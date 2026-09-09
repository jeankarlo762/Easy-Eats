import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { EmpresaService } from '../superadmin-empresas/empresa.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

@Component({
  selector: 'app-configuracoes-geral',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CarregandoComponent],
  templateUrl: './configuracoes-geral.html',
  styleUrl: './configuracoes-geral.scss',
})
export class ConfiguracoesGeral implements OnInit {
  private fb = inject(FormBuilder);
  private empresaService = inject(EmpresaService);

  carregando = true;
  enviando = false;
  erro: string | null = null;
  sucesso = false;

  form = this.fb.group({
    nomeEstabelecimento: ['', Validators.required],
    cnpj: [{ value: '', disabled: true }],
    endereco: [''],
    telefone: ['', Validators.required],
    horarioFuncionamento: [''],
  });

  ngOnInit() {
    this.carregando = true;

    this.empresaService.buscarMinhaEmpresa().subscribe({
      next: (empresa) => {
        this.form.patchValue({
          nomeEstabelecimento: empresa.nome,
          cnpj: empresa.cnpj,
          endereco: empresa.endereco ?? '',
          telefone: empresa.telefone ?? '',
          horarioFuncionamento: empresa.horarioFuncionamento ?? '',
        });
        this.carregando = false;
      },
      error: (erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os dados do estabelecimento.');
        this.carregando = false;
      },
    });
  }

  salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nomeEstabelecimento, endereco, telefone, horarioFuncionamento } = this.form.getRawValue();
    this.enviando = true;
    this.erro = null;
    this.sucesso = false;

    this.empresaService
      .atualizarMinhaEmpresa({
        nome: nomeEstabelecimento!,
        endereco: endereco || null,
        telefone: telefone!,
        horarioFuncionamento: horarioFuncionamento || null,
      })
      .subscribe({
        next: () => {
          this.enviando = false;
          this.sucesso = true;
        },
        error: (erro) => {
          this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível salvar as configurações.');
          this.enviando = false;
        },
      });
  }
}
