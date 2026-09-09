import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providersTeste } from '../testing/providers-teste';

import { ControleEstoque } from './controle-estoque';

describe('ControleEstoque', () => {
  let component: ControleEstoque;
  let fixture: ComponentFixture<ControleEstoque>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControleEstoque],
      providers: [providersTeste],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControleEstoque);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
