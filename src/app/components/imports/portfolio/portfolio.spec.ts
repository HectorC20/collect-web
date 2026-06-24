import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortfolioImportsComponent } from './portfolio';

describe('PortfolioImportsComponent', () => {
  let component: PortfolioImportsComponent;
  let fixture: ComponentFixture<PortfolioImportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioImportsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioImportsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
