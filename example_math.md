# KaTeX Math Rendering Test

This file contains various examples of mathematical expressions using KaTeX to test the Markdown Preview extension.

## Inline Math Examples

Here are some inline math examples using `$...$` syntax:

- The famous equation: $E = mc^2$
- Quadratic formula: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
- Euler's identity: $e^{i\pi} + 1 = 0$
- Binomial coefficient: $\binom{n}{k} = \frac{n!}{k!(n-k)!}$

## Display Math Examples

Display math uses `$$...$$` for standalone equations:

### Basic Equations

$$
\int_{-\infty}^\infty e^{-x^2} dx = \sqrt{\pi}
$$

### Matrices

$$
\begin{bmatrix}
    a & b \\
    c & d
\end{bmatrix}
\begin{bmatrix}
    x \\
    y
\end{bmatrix} =
\begin{bmatrix}
    ax + by \\
    cx + dy
\end{bmatrix}
$$

### Aligned Equations

$$
\begin{align}
    \nabla \times \mathbf{B} -\, \frac1c\, \frac{\partial\mathbf{E}}{\partial t} &= \frac{4\pi}{c}\mathbf{j} \\
    \nabla \cdot \mathbf{E} &= 4 \pi \rho \\
    \nabla \times \mathbf{E} +\, \frac1c\, \frac{\partial\mathbf{B}}{\partial t} &= \mathbf{0} \\
    \nabla \cdot \mathbf{B} &= 0
\end{align}
$$

### Probability and Statistics

$$
P(E) = {n \choose k} p^k (1-p)^{n-k}
$$

## Chemical Equations

$$
\text{2H}_2 + \text{O}_2 \rightarrow 2\text{H}_2\text{O}
$$

### Alternative Chemical Notation

For more complex chemical equations, you can use:

$$
\text{CH}_4 + 2\text{O}_2 \rightarrow \text{CO}_2 + 2\text{H}_2\text{O}
$$

$$
\text{N}_2 + 3\text{H}_2 \rightleftharpoons 2\text{NH}_3
$$

## Quantum Mechanics

$$
\hat{H} \psi = E \psi
$$

## Special Functions

$$
\Gamma(z) = \int_0^\infty t^{z-1}e^{-t}dt
$$

## Testing Inline vs Display

- Inline: $\sum_{i=1}^n i = \frac{n(n+1)}{2}$ vs Display: $$\sum_{i=1}^n i = \frac{n(n+1)}{2}$$
- Inline: $\int_a^b f(x) dx$ vs Display: $$\int_a^b f(x) dx$$
