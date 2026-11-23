import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ControleEstoque } from './controle-estoque';

describe('ControleEstoque', () => {
  let component: ControleEstoque;
  let fixture: ComponentFixture<ControleEstoque>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControleEstoque],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ControleEstoque);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
