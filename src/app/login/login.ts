import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CampoSenhaComponent } from '../../components/campo-senha/campo-senha';
import { CampoTextoComponent } from '../../components/campo-texto/campo-texto';
import { AuthService } from '../auth/auth.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  imports: [CommonModule, ReactiveFormsModule, CampoSenhaComponent, CampoTextoComponent],
  standalone: true,
})
export class Login {
  modoRecuperarSenha = false;
  currentYear: number = new Date().getFullYear();

  enviando = false;
  erro: string | null = null;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  mensagensValidacoes = {
    email: { required: 'Email é obrigatório.', email: 'Email inválido.' },
    password: { required: 'Senha obrigatória.' },
  };

  abrirRecuperarSenha() {
    this.modoRecuperarSenha = true;
    this.erro = null;
  }

  voltarParaLogin() {
    this.modoRecuperarSenha = false;
  }

  handleLogin() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.value;
    this.enviando = true;
    this.erro = null;

    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.enviando = false;
        let rota = '/home';
        if (this.authService.isSuperadmin()) {
          rota = '/superadmin-dashboard';
        } else if (this.authService.isGarcom()) {
          rota = '/novo-pedido';
        } else if (this.authService.isCozinheiro()) {
          rota = '/tela-cozinha';
        }
        this.router.navigate([rota]);
      },
      error: (erro) => {
        this.enviando = false;
        // Antes qualquer falha virava "e-mail ou senha inválidos" — inclusive
        // API fora do ar ou erro 500, o que mandava o usuário conferir a senha
        // sem motivo. A mensagem do backend só é usada quando ele de fato
        // responde (401 traz "E-mail ou senha inválidos").
        this.erro = MensagemErroApiUtil.extrair(
          erro,
          erro?.status === 0
            ? 'Não foi possível conectar ao servidor. Verifique se a API está no ar.'
            : 'Não foi possível entrar. Tente novamente.',
        );
      },
    });
  }
}
