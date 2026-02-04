import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroAlumnoComponent } from './registro-alumno.component';

describe('RegistroAlumnoComponent', () => {
  let component: RegistroAlumnoComponent;
  let fixture: ComponentFixture<RegistroAlumnoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroAlumnoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistroAlumnoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
