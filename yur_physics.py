<<<<<<< HEAD
import numpy as np
from sympy import symbols, limit, oo
import matplotlib.pyplot as plt

# Define T = infinity * 0
def compute_T():
    epsilon = symbols('epsilon')
    T = limit(1/epsilon * epsilon, epsilon, 0, dir='+')  # Resolves to 1
    return float(T)

# Void entropy (quantum superposition state)
def void_entropy(T, rho):
    return -T * np.trace(rho @ np.log(rho + 1e-10))  # Avoid log(0)

# Dark energy from T
def dark_energy(T, H0=70 / 3.086e19):  # Hubble constant in s^-1
    return 3 * H0**2 * T  # Lambda in s^-2

# Entanglement phase shift (BMV-inspired)
def entanglement_phase(T, m=1e-3, r=1e-6):  # Mass in kg, distance in m
    G, hbar = 6.674e-11, 1.055e-34  # SI units
    return (G * m / (hbar * r)) * np.log(T + 1)

# Simulate and plot
def run_yur_simulation():
    T = compute_T()
    rho_void = np.array([[0.5, 0], [0, 0.5]])  # 2-qubit superposition
    S = void_entropy(T, rho_void)
    Lambda = dark_energy(T)
    phi = entanglement_phase(T)

    print(f"YUR Simulation Results:")
    print(f"Void Entropy: {S:.2f} bits")
    print(f"Cosmological Constant: {Lambda:.2e} s^-2")
    print(f"Entanglement Phase Shift: {phi:.2e} rad")

    # Plot void-to-cosmos transition
    t = np.linspace(0, 1, 100)
    entropy_evolution = [void_entropy(ti, rho_void) for ti in t]
    plt.plot(t, entropy_evolution, label="Void Entropy")
    plt.xlabel("T Resolution (0 to 1)")
    plt.ylabel("Entropy (bits)")
    plt.title("YUR: Void to Cosmos")
    plt.legend()
    plt.savefig("yur_entropy.png")
    plt.show()

if __name__ == "__main__":
    run_yur_simulation() 
=======
import numpy as np
from sympy import symbols, limit, oo
import matplotlib.pyplot as plt

# Define T = infinity * 0
def compute_T():
    epsilon = symbols('epsilon')
    T = limit(1/epsilon * epsilon, epsilon, 0, dir='+')  # Resolves to 1
    return float(T)

# Void entropy (quantum superposition state)
def void_entropy(T, rho):
    return -T * np.trace(rho @ np.log(rho + 1e-10))  # Avoid log(0)

# Dark energy from T
def dark_energy(T, H0=70 / 3.086e19):  # Hubble constant in s^-1
    return 3 * H0**2 * T  # Lambda in s^-2

# Entanglement phase shift (BMV-inspired)
def entanglement_phase(T, m=1e-3, r=1e-6):  # Mass in kg, distance in m
    G, hbar = 6.674e-11, 1.055e-34  # SI units
    return (G * m / (hbar * r)) * np.log(T + 1)

# Simulate and plot
def run_yur_simulation():
    T = compute_T()
    rho_void = np.array([[0.5, 0], [0, 0.5]])  # 2-qubit superposition
    S = void_entropy(T, rho_void)
    Lambda = dark_energy(T)
    phi = entanglement_phase(T)

    print(f"YUR Simulation Results:")
    print(f"Void Entropy: {S:.2f} bits")
    print(f"Cosmological Constant: {Lambda:.2e} s^-2")
    print(f"Entanglement Phase Shift: {phi:.2e} rad")

    # Plot void-to-cosmos transition
    t = np.linspace(0, 1, 100)
    entropy_evolution = [void_entropy(ti, rho_void) for ti in t]
    plt.plot(t, entropy_evolution, label="Void Entropy")
    plt.xlabel("T Resolution (0 to 1)")
    plt.ylabel("Entropy (bits)")
    plt.title("YUR: Void to Cosmos")
    plt.legend()
    plt.savefig("yur_entropy.png")
    plt.show()

if __name__ == "__main__":
    run_yur_simulation() 
>>>>>>> 49ba19d91828f31b15823be095b7877c6c504df7
