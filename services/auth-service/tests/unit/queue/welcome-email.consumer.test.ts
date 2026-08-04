import type { Channel, ConsumeMessage } from "amqplib";
import { QUEUE_NAMES } from "@platform/shared-types";
import { MAX_ATTEMPTS } from "../../../src/queue/consumers/with-retry";

const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => mockLogger,
} as any;

function buildMockChannel(): Channel {
  return {
    ack: vi.fn(),
    nack: vi.fn(),
    publish: vi.fn().mockReturnValue(true),
  } as any;
}

function buildMockMsg(payload: object, headers?: Record<string, unknown>): ConsumeMessage {
  return {
    content: Buffer.from(JSON.stringify(payload)),
    properties: {
      contentType: "application/json",
      headers: headers ?? {},
    },
    fields: {
      routingKey: QUEUE_NAMES.AUTH_WELCOME_EMAIL,
      deliveryTag: 1,
      redelivered: false,
      exchange: "auth.events",
      messageCount: 0,
    },
  } as any;
}

describe("welcome-email consumer", () => {
  it("acks message on successful email send", async () => {
    const { startWelcomeEmailConsumer } = await import(
      "../../../src/queue/consumers/welcome-email.consumer"
    );
    const channel = buildMockChannel();
    const mockEmailService = { sendWelcomeEmail: vi.fn().mockResolvedValue(undefined) };

    const mockClient = {
      consumerChannel: channel,
      publishChannel: channel,
      connection: {} as any,
      close: vi.fn(),
    };

    // startWelcomeEmailConsumer calls channel.consume with a callback
    let consumeCallback: ((msg: ConsumeMessage | null) => void) | undefined;
    channel.consume = vi.fn().mockImplementation((_queue: string, cb: any) => {
      consumeCallback = cb;
      return Promise.resolve();
    });

    await startWelcomeEmailConsumer(mockClient as any, {
      emailService: mockEmailService as any,
      logger: mockLogger,
    });

    // Simulate receiving a message
    const msg = buildMockMsg({ userId: "u1", email: "a@b.com", name: "Test" });
    consumeCallback!(msg);

    // Wait for async handler
    await new Promise((r) => setTimeout(r, 10));

    expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith({
      userId: "u1",
      email: "a@b.com",
      name: "Test",
    });
    expect(channel.ack).toHaveBeenCalledWith(msg);
  });

  it("nacks and dead-letters after max retries", async () => {
    const { startWelcomeEmailConsumer } = await import(
      "../../../src/queue/consumers/welcome-email.consumer"
    );
    const channel = buildMockChannel();
    const mockEmailService = {
      sendWelcomeEmail: vi.fn().mockRejectedValue(new Error("send failed")),
    };

    const mockClient = {
      consumerChannel: channel,
      publishChannel: channel,
      connection: {} as any,
      close: vi.fn(),
    };

    let consumeCallback: ((msg: ConsumeMessage | null) => void) | undefined;
    channel.consume = vi.fn().mockImplementation((_queue: string, cb: any) => {
      consumeCallback = cb;
      return Promise.resolve();
    });

    await startWelcomeEmailConsumer(mockClient as any, {
      emailService: mockEmailService as any,
      logger: mockLogger,
    });

    // Simulate a message that has already been retried MAX_ATTEMPTS times
    const msg = buildMockMsg(
      { userId: "u1", email: "a@b.com", name: "Test" },
      { "x-attempts": MAX_ATTEMPTS },
    );
    consumeCallback!(msg);

    await new Promise((r) => setTimeout(r, 10));

    // Should nack without requeue (dead-letter)
    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
  });
});

describe("audit-log consumer", () => {
  it("acks message on successful persist", async () => {
    const { startAuditLogConsumer } = await import(
      "../../../src/queue/consumers/audit-log.consumer"
    );
    const channel = buildMockChannel();
    const mockAuditService = { persistAuditLog: vi.fn().mockResolvedValue(undefined) };

    const mockClient = {
      consumerChannel: channel,
      publishChannel: channel,
      connection: {} as any,
      close: vi.fn(),
    };

    let consumeCallback: ((msg: ConsumeMessage | null) => void) | undefined;
    channel.consume = vi.fn().mockImplementation((_queue: string, cb: any) => {
      consumeCallback = cb;
      return Promise.resolve();
    });

    await startAuditLogConsumer(mockClient as any, {
      auditService: mockAuditService as any,
      logger: mockLogger,
    });

    const msg = buildMockMsg({
      userId: "u1",
      eventType: "login",
      ip: "127.0.0.1",
      timestamp: Date.now(),
    });
    consumeCallback!(msg);

    await new Promise((r) => setTimeout(r, 10));

    expect(mockAuditService.persistAuditLog).toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledWith(msg);
  });

  it("retries on failure and dead-letters after max attempts", async () => {
    const { startAuditLogConsumer } = await import(
      "../../../src/queue/consumers/audit-log.consumer"
    );
    const channel = buildMockChannel();
    const mockAuditService = {
      persistAuditLog: vi.fn().mockRejectedValue(new Error("db error")),
    };

    const mockClient = {
      consumerChannel: channel,
      publishChannel: channel,
      connection: {} as any,
      close: vi.fn(),
    };

    let consumeCallback: ((msg: ConsumeMessage | null) => void) | undefined;
    channel.consume = vi.fn().mockImplementation((_queue: string, cb: any) => {
      consumeCallback = cb;
      return Promise.resolve();
    });

    await startAuditLogConsumer(mockClient as any, {
      auditService: mockAuditService as any,
      logger: mockLogger,
    });

    // Message already at max retries
    const msg = buildMockMsg(
      { userId: "u1", eventType: "logout", timestamp: Date.now() },
      { "x-attempts": MAX_ATTEMPTS },
    );
    consumeCallback!(msg);

    await new Promise((r) => setTimeout(r, 10));

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
  });
});
