import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink], 
  templateUrl: './landingPage.html',
  styleUrl: './landingPage.scss'
})
export class LandingPage {
  membros = [
    { nome: 'João Vitor', cargo: 'Desenvolvedor Full-Stack' },
    { nome: 'Lucas Mendes', cargo: 'Desenvolvedor Full-Stack' },
    { nome: 'Isaque Lopes', cargo: 'POO' },
    { nome: 'Pedro Henrique', cargo: 'Desenvolvedor Front-End' },
    { nome: 'Jean May', cargo: 'Desenvolvedor Back-End' },
    { nome: 'Douglas Vieira', cargo: 'Desenvolvedor Front-End' }
  ];
}