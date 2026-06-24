import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BracketComponent } from './bracket';

describe('BracketComponent', () => {
  let component: BracketComponent;
  let fixture: ComponentFixture<BracketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BracketComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BracketComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
