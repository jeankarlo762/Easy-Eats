import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providersTeste } from '../testing/providers-teste';

import { ComponentFila } from './component.fila';

describe('ComponentFila', () => {
  let component: ComponentFila;
  let fixture: ComponentFixture<ComponentFila>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentFila],
      providers: [providersTeste],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponentFila);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});