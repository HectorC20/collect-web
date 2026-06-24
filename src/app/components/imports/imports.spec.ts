import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportsComponent } from './imports';

describe('ImportsComponent', () => {
  let component: ImportsComponent;
  let fixture: ComponentFixture<ImportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
