import forestTile from '../assets/images/satellite_sample_forest_1793622550237.jpg';
import { QueueItem } from '../types/prediction';

export class ReviewQueueService {
  private realQueue: QueueItem[] = [];
  private exampleQueue: QueueItem[] = [];

  constructor() {
    // Populate an initial illustrative example item so the user can immediately experience the review workflow
    this.exampleQueue = [
      {
        id: 'example-demo-1',
        predictedClass: 'Water',
        modelScore: 0.58,
        scoreThresholdUsed: 0.70,
        classScores: [
          { label: 'Water', score: 0.58 },
          { label: 'Wetland', score: 0.24 },
          { label: 'Forest', score: 0.12 },
          { label: 'Built-up', score: 0.06 },
        ],
        reviewRecommended: true,
        modelVersion: 'colab-prototype-v0 (illustrative fixture)',
        isExample: true,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        addedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        imageMetadata: {
          name: 'coastal_estuary_tile_492.jpg',
          width: 512,
          height: 512,
          sizeBytes: 341200,
          dataUrl: forestTile,
        },
        reviewStatus: 'flagged',
        reviewerNotes: 'Uncalibrated top score (0.58) below 0.70 confidence threshold. Boundary between open water and wetland canopy requires planner verification.',
      },
      {
        id: 'example-demo-2',
        predictedClass: 'Forest',
        modelScore: 0.82,
        scoreThresholdUsed: 0.70,
        classScores: [
          { label: 'Forest', score: 0.82 },
          { label: 'Water', score: 0.09 },
          { label: 'Agriculture', score: 0.06 },
          { label: 'Built-up', score: 0.03 },
        ],
        reviewRecommended: false,
        modelVersion: 'colab-prototype-v0 (illustrative fixture)',
        isExample: true,
        timestamp: new Date(Date.now() - 7200000 * 3).toISOString(),
        addedAt: new Date(Date.now() - 7200000 * 3).toISOString(),
        imageMetadata: {
          name: 'canopy_reserve_zone_b.png',
          width: 512,
          height: 512,
          sizeBytes: 421000,
          dataUrl: forestTile,
        },
        reviewStatus: 'approved',
        reviewerNotes: 'High clear score above threshold. Canopy density confirmed visually.',
        humanAssignedClass: 'Forest',
      }
    ];
  }

  public getRealItems(): QueueItem[] {
    return [...this.realQueue];
  }

  public getExampleItems(): QueueItem[] {
    return [...this.exampleQueue];
  }

  public addToQueue(item: QueueItem): void {
    if (item.isExample) {
      // Keep strictly in example queue
      this.exampleQueue = [item, ...this.exampleQueue.filter(i => i.id !== item.id)];
    } else {
      // Real queue
      this.realQueue = [item, ...this.realQueue.filter(i => i.id !== item.id)];
    }
  }

  public updateStatus(
    id: string,
    isExample: boolean,
    status: 'pending' | 'flagged' | 'approved' | 'reclassified',
    humanClass?: string,
    notes?: string
  ): void {
    const targetQueue = isExample ? this.exampleQueue : this.realQueue;
    const index = targetQueue.findIndex(i => i.id === id);
    if (index !== -1) {
      targetQueue[index] = {
        ...targetQueue[index],
        reviewStatus: status,
        humanAssignedClass: humanClass ?? targetQueue[index].humanAssignedClass,
        reviewerNotes: notes !== undefined ? notes : targetQueue[index].reviewerNotes,
      };
    }
  }

  public removeItem(id: string, isExample: boolean): void {
    if (isExample) {
      this.exampleQueue = this.exampleQueue.filter(i => i.id !== id);
    } else {
      this.realQueue = this.realQueue.filter(i => i.id !== id);
    }
  }

  public clearQueue(isExample: boolean): void {
    if (isExample) {
      this.exampleQueue = [];
    } else {
      this.realQueue = [];
    }
  }
}
