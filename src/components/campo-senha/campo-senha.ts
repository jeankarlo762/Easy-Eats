import { Component, Input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let proximoId = 0;

/**
 * Campo de senha reutilizável com botão de mostrar/ocultar. Único ponto de
 * verdade para esse padrão de input — antes cada tela reimplementava seu
 * próprio ícone de olho, o que causava bugs de alinhamento (ver login).
 */
@Component({
  selector: 'app-campo-senha',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campo-senha.html',
  styleUrl: './campo-senha.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CampoSenhaComponent),
      multi: true,
    },
  ],
})
export class CampoSenhaComponent implements ControlValueAccessor {
  @Input() placeholder = '••••••••';

  readonly inputId = `campo-senha-${proximoId++}`;
  // signals: o app é zoneless, então o reset/patch do formulário só aparece na tela via signal
  valor = signal('');
  mostrarSenha = false;
  desabilitado = signal(false);

  private onChange: (valor: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(valor: string): void {
    this.valor.set(valor ?? '');
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado.set(desabilitado);
  }

  aoDigitar(valor: string) {
    this.valor.set(valor);
    this.onChange(valor);
  }

  aoTocar() {
    this.onTouched();
  }

  alternarVisibilidade() {
    this.mostrarSenha = !this.mostrarSenha;
  }
}
