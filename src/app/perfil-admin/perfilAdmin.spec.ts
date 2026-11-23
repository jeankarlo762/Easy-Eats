import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PerfilAdmin } from './perfilAdmin';

describe('PerfilAdmin', () => {
  let component: PerfilAdmin;
  let fixture: ComponentFixture<PerfilAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilAdmin],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
