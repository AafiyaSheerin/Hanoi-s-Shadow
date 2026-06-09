class TowerOfHanoi:
    def __init__(self, num_disks=3):
        self.num_disks = num_disks
        # Start all disks on Peg 0 (A) in descending order
        self.pegs = [list(range(num_disks, 0, -1)), [], []]
        self.move_count = 0
        self.selected_disk = None
        self.source_peg_idx = None
        self.is_won = False
        self.history = []  # Stores a history stack of previous peg states for Undo

    def select_disk(self, peg_idx):
        """Lifts the top disk off a peg if no disk is currently held."""
        if self.selected_disk is not None or not self.pegs[peg_idx]:
            return False
        
        self.selected_disk = self.pegs[peg_idx].pop()
        self.source_peg_idx = peg_idx
        return True

    def place_disk(self, peg_idx):
        """Drops the held disk onto a peg if it follows the golden rule."""
        if self.selected_disk is None:
            return False
            
        # Golden Rule: Cannot place a larger disk on top of a smaller disk
        if self.pegs[peg_idx] and self.pegs[peg_idx][-1] < self.selected_disk:
            return False
            
        # Save current state to history BEFORE modifying it for the move
        current_pegs_snapshot = [list(p) for p in self.pegs]
        # Put the disk back on its source peg for the snapshot to represent the clean pre-move state
        current_pegs_snapshot[self.source_peg_idx].append(self.selected_disk)
        self.history.append({
            "pegs": current_pegs_snapshot,
            "move_count": self.move_count
        })

        # Execute the move
        self.pegs[peg_idx].append(self.selected_disk)
        self.move_count += 1
        self.selected_disk = None
        self.source_peg_idx = None
        
        # Check winning criteria: All disks moved to Peg C (Index 2)
        if len(self.pegs[2]) == self.num_disks:
            self.is_won = True
            
        return True

    def undo_move(self):
        """Reverts the board back to the previous historical state."""
        if not self.history or self.selected_disk is not None:
            return False  # Can't undo if history is empty or if currently holding a disk
            
        previous_state = self.history.pop()
        self.pegs = previous_state["pegs"]
        self.move_count = previous_state["move_count"]
        self.is_won = False  # Reset win state if they undo away from victory
        return True

    def get_state(self):
        return {
            "pegs": self.pegs,
            "move_count": self.move_count,
            "selected_disk": self.selected_disk,
            "is_won": self.is_won,
            "num_disks": self.num_disks
        }