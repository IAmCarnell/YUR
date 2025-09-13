import numpy as np
import sympy as sp
import matplotlib.pyplot as plt
import traceback

print("Starting YUR physics core...")

def compute_T():
    """Compute T = infinity * 0, stabilized to 1 for the Void-Full Framework."""
    return 1.0

def void_entropy(T: float) -> float:
    """Void entropy (bits) — simplified information growth."""
    return np.log2(1 + T)

def dark_energy(T: float) -> float:
    """Cosmological constant Λ in s^-2 scaled by T (DESI-aligned baseline)."""
    return 1.63e-35 * T

def entanglement_phase(T: float) -> float:
    """Entanglement phase shift (radians)."""
    return 0.006 * T

def neutrino_mass(T: float, base_mass: float = 0.058) -> float:
    """Active neutrino mass estimate (eV)."""
    return base_mass * T

def run_simulation():
    """Run minimal VFF simulation (trimmed: removed legacy geometric & auxiliary QAI terms)."""
    try:
        T = compute_T()
        entropy = void_entropy(T)
        lambda_val = dark_energy(T)
        phase = entanglement_phase(T)
        nu_mass = neutrino_mass(T)

        print("YUR Core Simulation Results:")
        print(f" T (stabilized): {T:.3f}")
        print(f" Void Entropy: {entropy:.3f} bits")
        print(f" Cosmological Constant Λ: {lambda_val:.2e} s^-2")
        print(f" Entanglement Phase Shift: {phase:.3e} rad")
        print(f" Active Neutrino Mass: {nu_mass:.3f} eV")

        # Simple progression plot over T ∈ [0,2]
        t_values = np.linspace(0, 2, 100)
        entropy_values = [void_entropy(t) for t in t_values]
        lambda_values = [dark_energy(t) for t in t_values]
        phase_values = [entanglement_phase(t) for t in t_values]

        fig, ax1 = plt.subplots()
        ax1.set_title("Void-Full Core Progressions")
        ax1.plot(t_values, entropy_values, label="Void Entropy (bits)", color="blue")
        ax1.plot(t_values, phase_values, label="Entanglement Phase (rad)", color="purple")
        ax1.set_xlabel("T (Void-Full Parameter)")
        ax1.set_ylabel("Entropy / Phase")

        ax2 = ax1.twinx()
        ax2.plot(t_values, lambda_values, label="Λ (s^-2)", color="red", linestyle="--")
        ax2.set_ylabel("Λ (s^-2)")

        lines_1, labels_1 = ax1.get_legend_handles_labels()
        lines_2, labels_2 = ax2.get_legend_handles_labels()
        ax1.legend(lines_1 + lines_2, labels_1 + labels_2, loc="upper left")

        ax1.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig("yur_core.png")
        plt.show()

    except Exception as e:
        print(f"Error in simulation: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    run_simulation()