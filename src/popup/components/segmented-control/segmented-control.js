document.addEventListener("DOMContentLoaded", () => {
  const segmentedControl = document.querySelector(".segmented-control");
  if (segmentedControl) {
    const buttons = segmentedControl.querySelectorAll(
      ".segmented-control-button"
    );

    const handleSelection = (selectedButton) => {
      buttons.forEach((button) => {
        const isSelected = button === selectedButton;
        button.classList.toggle("active", isSelected);
        button.setAttribute("aria-checked", isSelected);
      });

      const selectedValue = selectedButton.dataset.value;
      console.log(`Selected option: ${selectedValue}`);
      // TODO: Add logic to enable/disable inspector and mini mode
    };

    segmentedControl.addEventListener("click", (event) => {
      const button = event.target.closest(".segmented-control-button");
      if (button) {
        handleSelection(button);
      }
    });

    segmentedControl.addEventListener("keydown", (event) => {
      const currentButton = document.activeElement;
      if (!currentButton.matches(".segmented-control-button")) {
        return;
      }

      let nextButton;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextButton = currentButton.nextElementSibling;
        if (!nextButton) {
          nextButton = segmentedControl.firstElementChild;
        }
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextButton = currentButton.previousElementSibling;
        if (!nextButton) {
          nextButton = segmentedControl.lastElementChild;
        }
      }

      if (nextButton) {
        event.preventDefault();
        nextButton.focus();
        handleSelection(nextButton);
      }
    });
  }
});
