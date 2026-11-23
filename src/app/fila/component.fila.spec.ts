import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ComponentFila } from './component.fila';

describe('ComponentFila', () => {
  let component: ComponentFila;
  let fixture: ComponentFixture<ComponentFila>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentFila],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentFila);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
