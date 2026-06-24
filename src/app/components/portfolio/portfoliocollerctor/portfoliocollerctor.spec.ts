import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Portfoliocollerctor } from './portfoliocollerctor';

describe('Portfoliocollerctor', () => {
  let component: Portfoliocollerctor;
  let fixture: ComponentFixture<Portfoliocollerctor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Portfoliocollerctor],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Portfoliocollerctor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
