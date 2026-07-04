import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { globalHttpErrorInterceptor } from './global-http-error.interceptor';
import { ErrorNotificationService } from '../services/error-notification.service';

const makeErrorNotificationMock = () => ({
  handle: jest.fn(),
});

describe('globalHttpErrorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let notificationMock: ReturnType<typeof makeErrorNotificationMock>;

  beforeEach(() => {
    notificationMock = makeErrorNotificationMock();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([globalHttpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: ErrorNotificationService, useValue: notificationMock },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('ruft den ErrorNotificationService bei einem 500-Fehler auf', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpTesting.expectOne('/api/test').flush('', { status: 500, statusText: 'Server Error' });

    expect(notificationMock.handle).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
  });

  it('ruft den ErrorNotificationService bei einem 503-Fehler auf', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpTesting
      .expectOne('/api/test')
      .flush('', { status: 503, statusText: 'Service Unavailable' });

    expect(notificationMock.handle).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }));
  });

  it('ruft den ErrorNotificationService bei einem Netzwerkfehler (status 0) auf', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpTesting.expectOne('/api/test').error(new ProgressEvent('error'));

    expect(notificationMock.handle).toHaveBeenCalledWith(expect.objectContaining({ status: 0 }));
  });

  it('leitet den Fehler weiter, damit Komponenten selbst reagieren können', (done) => {
    http.get('/api/test').subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
        done();
      },
    });
    httpTesting.expectOne('/api/test').flush('', { status: 500, statusText: 'Server Error' });
  });

  it('ruft den ErrorNotificationService bei einem 400-Fehler NICHT auf', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpTesting.expectOne('/api/test').flush('', { status: 400, statusText: 'Bad Request' });

    expect(notificationMock.handle).not.toHaveBeenCalled();
  });

  it('ruft den ErrorNotificationService bei einem 404-Fehler NICHT auf', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpTesting.expectOne('/api/test').flush('', { status: 404, statusText: 'Not Found' });

    expect(notificationMock.handle).not.toHaveBeenCalled();
  });

  it('lässt erfolgreiche Requests (2xx) unberührt', (done) => {
    http.get('/api/test').subscribe({
      next: (res) => {
        expect(res).toBeTruthy();
        done();
      },
    });
    httpTesting.expectOne('/api/test').flush({ data: 'ok' });

    expect(notificationMock.handle).not.toHaveBeenCalled();
  });
});
