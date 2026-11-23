import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Empresa, EmpresaService } from './empresa.service';
import { Segmento, SegmentoService } from '../superadmin-segmentos/segmento.service';

@Component({
  selector: 'app-superadmin-empresas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './superadmin-empresas.html',
  styleUrl: './superadmin-empresas.scss',
})
export class SuperadminEmpresas implements OnInit {
  private fb = inject(FormBuilder);
  private empresaService = inject(EmpresaService);
  private segmentoService = inject(SegmentoService);

  empresas: Empresa[] = [];
  segmentos: Segmento[] = [];
  editandoId: number | null = null;
  termoBusca = '';
  carregando = false;
  erro: string | null = null;

  form = this.fb.group({
    nome: ['', Validators.required],
    cnpj: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefone: [''],
    segmentoId: [null as number | null],
    flAtivo: [true],
  });

  ngOnInit() {
    this.carregar();
    this.segmentoService.listar().subscribe((segmentos) => (this.segmentos = segmentos));
  }

  carregar() {
    this.carregando = true;
    this.erro = null;
    this.empresaService.listar().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar as empresas.';
        this.carregando = false;
      },
    });
  }

  get empresasFiltradas(): Empresa[] {
    const termo = this.termoBusca.trim().toLowerCase();
    if (!termo) {
      return this.empresas;
    }
    return this.empresas.filter(
      (e) =>
        e.nome.toLowerCase().includes(termo) ||
        e.cnpj.toLowerCase().includes(termo) ||
        e.email.toLowerCase().includes(termo) ||
        String(e.id).includes(termo),
    );
  }

  salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, cnpj, email, telefone, segmentoId, flAtivo } = this.form.value;
    const payload = {
      nome: nome!,
      cnpj: cnpj!,
      email: email!,
      telefone: telefone || null,
      flAtivo: flAtivo ?? true,
      segmento: segmentoId ? { id: segmentoId } : null,
    };

    const operacao =
      this.editandoId !== null
        ? this.empresaService.atualizar(this.editandoId, payload)
        : this.empresaService.criar(payload);

    operacao.subscribe({
      next: () => {
        this.cancelarEdicao();
        this.carregar();
      },
      error: () => {
        this.erro = 'Não foi possível salvar a empresa.';
      },
    });
  }

  editar(empresa: Empresa) {
    this.editandoId = empresa.id;
    this.form.setValue({
      nome: empresa.nome,
      cnpj: empresa.cnpj,
      email: empresa.email,
      telefone: empresa.telefone ?? '',
      segmentoId: empresa.segmento?.id ?? null,
      flAtivo: empresa.flAtivo,
    });
  }

  cancelarEdicao() {
    this.editandoId = null;
    this.form.reset({ nome: '', cnpj: '', email: '', telefone: '', segmentoId: null, flAtivo: true });
  }

  excluir(empresa: Empresa) {
    if (!confirm(`Excluir a empresa "${empresa.nome}"?`)) {
      return;
    }
    this.empresaService.excluir(empresa.id).subscribe({
      next: () => this.carregar(),
      error: () => {
        this.erro = 'Não foi possível excluir a empresa.';
      },
    });
  }

  badgeStatus(flAtivo: boolean): string {
    return flAtivo ? 'sucesso' : 'erro';
  }
}
