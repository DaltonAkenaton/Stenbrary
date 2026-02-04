import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeleccionMotivoComponent } from './seleccion-motivo.component';

describe('SeleccionMotivoComponent', () => {
  let component: SeleccionMotivoComponent;
  let fixture: ComponentFixture<SeleccionMotivoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeleccionMotivoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeleccionMotivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
