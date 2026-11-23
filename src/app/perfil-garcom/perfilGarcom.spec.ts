import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PerfilGarcom } from './perfilGarcom';

describe('PerfilGarcom', () => {
  let component: PerfilGarcom;
  let fixture: ComponentFixture<PerfilGarcom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilGarcom],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilGarcom);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
