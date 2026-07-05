import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorNotificationService, ERROR_MESSAGES } from './error-notification.service';
import { ToastService } from './toast.service';

const makeToastServiceMock = () => ({
  show: jest.fn(),
});

describe('ErrorNotificationService', () => {
  let service: ErrorNotificationService;
  let toastMock: ReturnType<typeof makeToastServiceMock>;

  beforeEach(() => {
    toastMock = makeToastServiceMock();

    TestBed.configureTestingModule({
      providers: [ErrorNotificationService, { provide: ToastService, useValue: toastMock }],
    });

    service = TestBed.inject(ErrorNotificationService);
  });

  it('zeigt die korrekte Nachricht für einen 500-Fehler an', () => {
    service.handle(new HttpErrorResponse({ status: 500 }));

    expect(toastMock.show).toHaveBeenCalledWith(ERROR_MESSAGES[500]);
  });

  it('zeigt die korrekte Nachricht für einen 503-Fehler an', () => {
    service.handle(new HttpErrorResponse({ status: 503 }));

    expect(toastMock.show).toHaveBeenCalledWith(ERROR_MESSAGES[503]);
  });

  it('zeigt die korrekte Nachricht bei Netzwerkfehler (status 0) an', () => {
    service.handle(new HttpErrorResponse({ status: 0 }));

    expect(toastMock.show).toHaveBeenCalledWith(ERROR_MESSAGES[0]);
  });

  it('zeigt Fallback-Nachricht für unbekannte Statuscodes an', () => {
    service.handle(new HttpErrorResponse({ status: 418 }));

    expect(toastMock.show).toHaveBeenCalledWith('Ein unbekannter Fehler ist aufgetreten.');
  });

  it('loggt Status, Message und URL bei jedem Fehler', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    service.handle(new HttpErrorResponse({ status: 500, url: '/api/test' }));

    expect(consoleSpy).toHaveBeenCalledWith(
      '[ErrorNotificationService]',
      expect.objectContaining({ status: 500, url: '/api/test' }),
    );

    consoleSpy.mockRestore();
  });
});
