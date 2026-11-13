export class MatchState {
  round = 1;
  wins: [number, number] = [0, 0];
  timeRemaining = 60;
  readonly roundDuration = 60;
  readonly roundsToWin = 2;

  resetMatch(): void {
    this.round = 1;
    this.wins = [0, 0];
    this.timeRemaining = this.roundDuration;
  }

  resetRoundTimer(): void {
    this.timeRemaining = this.roundDuration;
  }

  stepTimer(dt: number): boolean {
    if (this.timeRemaining <= 0) return true;
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    return this.timeRemaining <= 0;
  }

  recordRoundWinner(winner: 0 | 1 | 'draw'): { matchOver: boolean; matchWinner: 0 | 1 | null } {
    if (winner === 0 || winner === 1) {
      this.wins[winner]++;
      if (this.wins[winner] >= this.roundsToWin) {
        return { matchOver: true, matchWinner: winner };
      }
    }
    this.round++;
    return { matchOver: false, matchWinner: null };
  }

  get roundTitle(): string {
    if (this.wins[0] === 1 && this.wins[1] === 1) return 'FINAL ROUND';
    return `ROUND ${this.round}`;
  }
}
