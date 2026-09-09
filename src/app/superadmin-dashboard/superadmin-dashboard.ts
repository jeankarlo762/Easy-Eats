import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarregandoComponent } from '../../components/carregando/carregando';
import { Empresa, EmpresaService } from '../superadmin-empresas/empresa.service';
import { Usuario, UsuarioService } from '../usuarios/usuario.service';
import { MensagemErroApiUtil } from '../utils/mensagemErroApiUtil';

interface NovosClientesMes {
  mes: string;
  quantidade: number;
}

interface DistribuicaoSegmento {
  segmento: string;
  empresas: number;
  percentual: number;
  cor: string;
}

interface AlertaPlataforma {
  icone: string;
  cor: string;
  titulo: string;
  descricao: string;
}

const CORES_SEGMENTO = ['#2563eb', '#7c3aed', '#16a34a', '#ea580c', '#db2777', '#0891b2', '#9ca3af'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [CommonModule, CarregandoComponent],
  templateUrl: './superadmin-dashboard.html',
  styleUrl: './superadmin-dashboard.scss',
})
export class SuperadminDashboard implements OnInit {
  private empresaService = inject(EmpresaService);
  private usuarioService = inject(UsuarioService);

  carregando = true;
  erro: string | null = null;

  empresas: Empresa[] = [];
  usuarios: Usuario[] = [];

  ngOnInit() {
    this.carregando = true;

    Promise.all([
      new Promise<Empresa[]>((resolve, reject) => this.empresaService.listar().subscribe({ next: resolve, error: reject })),
      new Promise<Usuario[]>((resolve, reject) => this.usuarioService.listar().subscribe({ next: resolve, error: reject })),
    ])
      .then(([empresas, usuarios]) => {
        this.empresas = empresas;
        this.usuarios = usuarios;
        this.carregando = false;
      })
      .catch((erro) => {
        this.erro = MensagemErroApiUtil.extrair(erro, 'Não foi possível carregar o painel da plataforma.');
        this.carregando = false;
      });
  }

  get totalClientes(): number {
    return this.empresas.length;
  }

  get usuariosTotais(): number {
    return this.usuarios.length;
  }

  get empresasAtivas(): number {
    return this.empresas.filter((e) => e.flAtivo).length;
  }

  get empresasInativas(): number {
    return this.empresas.filter((e) => !e.flAtivo).length;
  }

  get novosClientesPorMes(): NovosClientesMes[] {
    const agora = new Date();
    const meses: NovosClientesMes[] = [];

    for (let i = 5; i >= 0; i--) {
      const referencia = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const quantidade = this.empresas.filter((e) => {
        if (!e.dtCriacao) return false;
        const data = new Date(e.dtCriacao);
        return data.getFullYear() === referencia.getFullYear() && data.getMonth() === referencia.getMonth();
      }).length;
      meses.push({ mes: MESES[referencia.getMonth()], quantidade });
    }

    return meses;
  }

  get maiorQuantidadeMes(): number {
    const valores = this.novosClientesPorMes.map((m) => m.quantidade);
    return valores.length ? Math.max(...valores, 1) : 1;
  }

  get distribuicaoSegmentos(): DistribuicaoSegmento[] {
    const mapa = new Map<string, number>();
    for (const empresa of this.empresas) {
      const nome = empresa.segmento?.nome ?? 'Sem segmento';
      mapa.set(nome, (mapa.get(nome) ?? 0) + 1);
    }

    const total = this.empresas.length || 1;
    return Array.from(mapa.entries())
      .map(([segmento, empresas], i) => ({
        segmento,
        empresas,
        percentual: Math.round((empresas / total) * 1000) / 10,
        cor: CORES_SEGMENTO[i % CORES_SEGMENTO.length],
      }))
      .sort((a, b) => b.empresas - a.empresas);
  }

  get ultimosClientes(): Empresa[] {
    return [...this.empresas]
      .filter((e) => e.dtCriacao)
      .sort((a, b) => new Date(b.dtCriacao as string).getTime() - new Date(a.dtCriacao as string).getTime())
      .slice(0, 5);
  }

  get alertas(): AlertaPlataforma[] {
    const alertas: AlertaPlataforma[] = [];

    if (this.empresasInativas > 0) {
      alertas.push({
        icone: 'bi-exclamation-triangle',
        cor: 'vermelho',
        titulo: `${this.empresasInativas} empresa(s) inativa(s)`,
        descricao: 'Sem acesso liberado à plataforma no momento.',
      });
    }

    const semSegmento = this.empresas.filter((e) => !e.segmento).length;
    if (semSegmento > 0) {
      alertas.push({
        icone: 'bi-diagram-3',
        cor: 'laranja',
        titulo: `${semSegmento} empresa(s) sem segmento definido`,
        descricao: 'Sem segmento, a empresa não tem funcionalidades liberadas no menu.',
      });
    }

    const usuariosInativos = this.usuarios.filter((u) => u.flAtivo === false).length;
    if (usuariosInativos > 0) {
      alertas.push({
        icone: 'bi-person-x',
        cor: 'azul',
        titulo: `${usuariosInativos} usuário(s) inativo(s) na plataforma`,
        descricao: 'Contas desativadas em uma ou mais empresas.',
      });
    }

    return alertas;
  }
}
