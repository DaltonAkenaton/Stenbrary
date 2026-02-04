import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmacionMatriculaDialogComponent } from './confirmacion-matricula-dialog.component';

describe('ConfirmacionMatriculaDialogComponent', () => {
  let component: ConfirmacionMatriculaDialogComponent;
  let fixture: ComponentFixture<ConfirmacionMatriculaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmacionMatriculaDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmacionMatriculaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
