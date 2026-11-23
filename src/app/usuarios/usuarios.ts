import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { CampoSenhaComponent } from '../../components/campo-senha/campo-senha';
import { CampoTextoComponent } from '../../components/campo-texto/campo-texto';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';
import { PERFIL_LABEL, Perfil } from '../auth/auth.service';
import { Usuario, UsuarioService } from './usuario.service';

interface OpcaoPerfil {
  valor: Perfil;
  descricao: string;
  icone: string;
  cor: string;
}

const OPCOES_PERFIL: OpcaoPerfil[] = [
  { valor: 'ADMINISTRADOR', descricao: 'Acesso completo, inclusive usuários', icone: 'bi-shield-check', cor: 'roxo' },
  { valor: 'GERENTE', descricao: 'Gestão: estoque, produtos, financeiro e relatórios', icone: 'bi-briefcase', cor: 'info' },
  { valor: 'FUNCIONARIO', descricao: 'Operação: mesas, pedidos e cozinha', icone: 'bi-person-badge', cor: 'laranja' },
];

function semEspacos(control: AbstractControl): ValidationErrors | null {
  const valor = (control.value as string | null) ?? '';
  return /\s/.test(valor) ? { espacos: true } : null;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [ReactiveFormsModule, CampoSenhaComponent, CampoTextoComponent, CarregandoComponent],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class Usuarios implements OnInit {
  private usuarioService = inject(UsuarioService);

  readonly opcoesPerfil = OPCOES_PERFIL;
  readonly perfilLabel = PERFIL_LABEL;

  usuarios = signal<Usuario[]>([]);
  carregando = signal(true);
  enviando = signal(false);
  erro = signal<string | null>(null);
  sucesso = signal<string | null>(null);

  form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), semEspacos],
    }),
    senha: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    perfil: new FormControl<Perfil>('FUNCIONARIO', { nonNullable: true, validators: Validators.required }),
  });

  ngOnInit() {
    this.carregarUsuarios();
  }

  carregarUsuarios() {
    this.carregando.set(true);
    this.usuarioService.listar().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erro.set(MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar os usuários cadastrados.'));
        this.carregando.set(false);
      },
    });
  }

  corPerfil(perfil: Perfil): string {
    return OPCOES_PERFIL.find((opcao) => opcao.valor === perfil)?.cor ?? 'neutro';
  }

  adicionar() {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const username = valores.username.trim();

    if (this.usuarios().some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      this.erro.set(`Já existe um usuário "${username}".`);
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);

    this.usuarioService.criar({ username, senha: valores.senha, perfil: valores.perfil }).subscribe({
      next: (usuarioCriado) => {
        this.enviando.set(false);
        this.usuarios.update((lista) =>
          [...lista, usuarioCriado].sort((a, b) => a.username.localeCompare(b.username)),
        );
        this.sucesso.set(`Usuário "${username}" cadastrado.`);
        this.form.reset({ username: '', senha: '', perfil: 'FUNCIONARIO' });
        setTimeout(() => this.sucesso.set(null), 4000);
      },
      error: (erro) => {
        this.enviando.set(false);
        this.erro.set(
          MensagemErroApiUtil.extrair(erro, 'Não foi possível cadastrar o usuário. Verifique os dados e tente novamente.'),
        );
      },
    });
  }
}
