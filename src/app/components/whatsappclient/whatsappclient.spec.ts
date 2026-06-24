import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Whatsappclient } from './whatsappclient';
import { WhatsappService } from '../../services/whatsapp.service';

const whatsappServiceStub = {
  getOverview: () => of({
    sessions: [],
    active_session_id: null,
    chats: [],
    contacts: [],
    active_chat_id: null,
    messages: [],
  }),
  createSession: () => of({}),
  updateSession: () => of({}),
  connectSession: () => of({}),
  disconnectSession: () => of({}),
  sendMessage: () => of({ message: 'ok', chat: null }),
  sendMessageToClient: () => of({ message: 'ok', chat: null }),
};

describe('Whatsappclient', () => {
  let component: Whatsappclient;
  let fixture: ComponentFixture<Whatsappclient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Whatsappclient],
      providers: [
        { provide: WhatsappService, useValue: whatsappServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Whatsappclient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
