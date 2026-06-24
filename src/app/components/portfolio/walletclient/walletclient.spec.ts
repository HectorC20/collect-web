import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Walletclient } from './walletclient';

describe('Walletclient', () => {
  let component: Walletclient;
  let fixture: ComponentFixture<Walletclient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Walletclient],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Walletclient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
