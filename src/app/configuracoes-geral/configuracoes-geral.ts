import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-configuracoes-geral',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracoes-geral.html',
  styleUrl: './configuracoes-geral.scss',
})
export class ConfiguracoesGeral {
  private fb = new FormBuilder();

  form = this.fb.group({
    nomeEstabelecimento: ['Easy Eats Food Truck', Validators.required],
    cnpj: ['12.345.678/0001-90', Validators.required],
    endereco: ['Av. das Palmeiras, 450 - Centro, São Paulo/SP', Validators.required],
    telefone: ['(11) 98765-4321', Validators.required],
    horarioFuncionamento: ['Seg a Sáb, 18h às 23h', Validators.required],
  });

  salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('Configurações do estabelecimento:', this.form.value);
    alert('Configurações salvas com sucesso!');
  }
}
