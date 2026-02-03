import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventEmitter } from 'events';

@Injectable()
export class ThirdPartySseClient extends EventEmitter implements OnModuleInit {
  private readonly baseUrl: string;
  private eventSource: EventSource | null = null;

  constructor(private readonly httpService: HttpService) {
    super();
    // video-task-processor has been removed, baseUrl is no longer needed
    this.baseUrl = '';
  }

  onModuleInit() {
    // Initialize without connecting - connection will be established when needed
  }

  connect(taskId: string) {
    // Close existing connection if any
    if (this.eventSource) {
      this.eventSource.close();
    }

    const url = `${this.baseUrl}/task/${taskId}/sse`;
    this.listenToThirdPartySse(url);
  }

  private listenToThirdPartySse(url: string) {
    this.eventSource = new EventSource(url);
    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit('data', data); // Emit data for other parts of the application
    };
    this.eventSource.onerror = (err) => {
      console.error('Error connecting to third-party SSE:', err);
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
