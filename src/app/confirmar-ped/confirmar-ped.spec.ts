import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmarPedComponent } from './confirmar-ped';

describe('ConfirmarPed', () => {
  let component: ConfirmarPedComponent;
  let fixture: ComponentFixture<ConfirmarPedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarPedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmarPedComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
