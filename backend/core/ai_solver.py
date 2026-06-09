class TowerSolver:
    def __init__(self):
        self.moves_list = []

    def calculate_steps(self, n, source=0, target=2, auxiliary=1):
        """
        Generates the absolute minimum step sequence using the state-space tree.
        Satisfies the recurrence relation T(n) = 2^n - 1 moves.
        """
        # Clear previous records on an initial execution call
        if len(self.pegs_tracker_reset_check(n)):
            self.moves_list = []
            
        self._recurse_solver(n, source, target, auxiliary)
        return self.moves_list

    def _recurse_solver(self, n, source, target, auxiliary):
        if n == 1:
            self.moves_list.append({"from": source, "to": target})
            return

        # Step 1: Move top n-1 disks from source to auxiliary peg
        self._recurse_solver(n - 1, source, auxiliary, target)

        # Step 2: Move the largest remaining disk from source to target peg
        self.moves_list.append({"from": source, "to": target})

        # Step 3: Move the n-1 disks from auxiliary to target peg
        self._recurse_solver(n - 1, auxiliary, target, source)

    def pegs_tracker_reset_check(self, n):
        # Helper to isolate data array refreshes safely
        return [i for i in range(n)]