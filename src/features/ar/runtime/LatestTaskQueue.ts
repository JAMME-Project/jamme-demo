type Result = 'applied' | 'superseded';
type Task<T> = {
  value: T;
  resolve: (result: Result) => void;
  reject: (error: unknown) => void;
  generation: number;
};

/** Only one SDK mutation runs at a time; pending work is replaced by the latest request. */
export class LatestTaskQueue<T> {
  private pending?: Task<T>;
  private running?: Promise<void>;
  private generation = 0;
  private sequence = 0;
  constructor(private readonly perform: (value: T) => Promise<void>) {}

  submit(value: T): Promise<Result> {
    this.sequence++;
    this.pending?.resolve('superseded');
    const result = new Promise<Result>((resolve, reject) => {
      this.pending = { value, resolve, reject, generation: this.generation };
    });
    if (!this.running) {
      this.running = this.drain();
    }
    return result;
  }

  invalidate(): void {
    this.generation++;
    this.pending?.resolve('superseded');
    this.pending = undefined;
  }
  async idle(): Promise<void> {
    await this.running;
  }

  private async drain(): Promise<void> {
    try {
      while (this.pending) {
        const task = this.pending;
        const sequence = this.sequence;
        this.pending = undefined;
        try {
          await this.perform(task.value);
          task.resolve(
            task.generation === this.generation && sequence === this.sequence
              ? 'applied'
              : 'superseded',
          );
        } catch (error) {
          if (task.generation !== this.generation || sequence !== this.sequence)
            task.resolve('superseded');
          else task.reject(error);
        }
      }
    } finally {
      this.running = undefined;
    }
  }
}
