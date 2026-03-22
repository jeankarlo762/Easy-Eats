import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormatarCPFUtil } from '../utils/formatarCpfUtil';
import { FormatarTelefoneUtil } from '../utils/formatarTelefoneUtil';
import { FormsModule, NgModel } from '@angular/forms';

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './cadastro.html',
  styleUrls: ['./cadastro.scss'],
})
export class Cadastro {
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  telefone: string = '';
  cpf: string = '';

  constructor(private router: Router) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  formatarCpf() {
    this.cpf = FormatarCPFUtil.formatar(this.cpf);
  }

  formatarTelefone() {
    this.telefone = FormatarTelefoneUtil.formatar(this.telefone);
  }
}
