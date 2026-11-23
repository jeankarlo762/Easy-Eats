import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
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
  modoRecuperarSenha = signal(false);
  currentYear: number = new Date().getFullYear();

  enviando = signal(false);
  erro = signal<string | null>(null);

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  aviso = signal<string | null>(
    this.route.snapshot.queryParamMap.get('sessao') === 'expirada'
      ? 'Sua sessão expirou. Entre novamente para continuar.'
      : null,
  );

  form = this.fb.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  });

  mensagensValidacoes = {
    email: { required: 'Usuário é obrigatório.' },
    password: { required: 'Senha obrigatória.' },
  };

  abrirRecuperarSenha() {
    this.modoRecuperarSenha.set(true);
    this.erro.set(null);
  }

  voltarParaLogin() {
    this.modoRecuperarSenha.set(false);
  }


  handleLogin(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    if (!email || !password) {
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);
    this.aviso.set(null);

    this.authService.login(email.trim(), password).subscribe({
      next: () => {
        this.enviando.set(false);
        this.router.navigate(['/home']);
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        // Credencial errada chega como 401/403 (o Spring encaminha a exceção para /error).
        const credencialInvalida =
          erro instanceof HttpErrorResponse && [400, 401, 403, 500].includes(erro.status);
        this.erro.set(
          credencialInvalida
            ? 'Usuário ou senha inválidos.'
            : MensagemErroApiUtil.extrair(erro, 'Não foi possível entrar. Tente novamente.'),
        );
      },
    });
  }

}
