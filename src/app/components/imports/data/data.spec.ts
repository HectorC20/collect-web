import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataImportsComponent } from './data';

describe('DataImportsComponent', () => {
  let component: DataImportsComponent;
  let fixture: ComponentFixture<DataImportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataImportsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DataImportsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
