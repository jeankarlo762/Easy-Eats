import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { providersTeste } from './testing/providers-teste';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [providersTeste],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  // O App é apenas a casca da aplicação: o template tem só <router-outlet>.
  // O teste antigo procurava um <h1>Hello, frontend</h1> do scaffold do CLI,
  // que nunca existiu neste projeto.
  it('renderiza o router-outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
