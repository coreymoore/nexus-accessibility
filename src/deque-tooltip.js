var langText = {
  errorNodeNotObject: "Node provided is not a DOM object.",
  errorNoTooltip: "tooltip attribute 'data-tooltip' not defined.",
  tooltip: "Tooltip",
};

class Tooltip {
  static elements = [];

  constructor(domNode, options) {
    var self = this;
    this.showOnFocus = true;
    this.keepTooltipOnMouseOver = true;
    this.tooltipMouseOver = false;

    if (typeof options != "object") options = {};
    if (typeof domNode != "object" && typeof domNode.nodeName === "undefined") {
      console.log(langText.errorNodeNotObject);
      return;
    }
    var tooltipText = domNode.getAttribute("data-tooltip");
    if (!tooltipText) {
      console.log(langText.errorNoTooltip);
      return;
    }
    var wrapperSpan = document.createElement("span");
    domNode.parentNode.replaceChild(wrapperSpan, domNode);
    wrapperSpan.appendChild(domNode);
    var tooltipSpan = document.createElement("span");
    wrapperSpan.appendChild(tooltipSpan);
    wrapperSpan.classList.add("tooltip-wrapper");
    tooltipSpan.classList.add("tooltip");
    tooltipSpan.setAttribute("role", "tooltip");
    tooltipSpan.id = crypto.randomUUID();
    domNode.setAttribute("aria-describedby", tooltipSpan.id);
    this.node = domNode;
    this.tooltip = tooltipSpan;

    if (typeof options != "object") options = {};
    if (
      typeof options["styleClass"] === "string" &&
      options["styleClass"].trim() != ""
    )
      tooltipSpan.classList.add(options["styleClass"]);
    if (typeof options["showOnFocus"] === "boolean")
      this.showOnFocus = options["showOnFocus"];
    if (typeof options["keepTooltipOnMouseOver"] === "boolean")
      this.keepTooltipOnMouseOver = options["keepTooltipOnMouseOver"];

    this.hideTooltip();
    tooltipSpan.innerHTML =
      '<span aria-label="Tooltip :" role="tooltip" ></span>' + tooltipText;
    domNode.addEventListener("mouseover", this.showTooltip.bind(this));
    domNode.addEventListener("mousemove", this.showTooltip.bind(this));
    domNode.addEventListener("mouseout", this.mouseOutHandler.bind(this));
    document.body.addEventListener("keydown", Tooltip.handleEscapeKey);

    if (this.showOnFocus) {
      domNode.addEventListener("focus", this.showTooltip.bind(this));
      domNode.addEventListener("blur", function () {
        if (!self.tooltipMouseOver) self.hideTooltip();
      });
    }
    if (this.keepTooltipOnMouseOver) {
      this.tooltip.addEventListener("mouseover", function () {
        self.tooltipMouseOver = true;
        self.showTooltip();
      });
      this.tooltip.addEventListener("mousemove", function () {
        self.tooltipMouseOver = true;
        self.showTooltip();
      });
      this.tooltip.addEventListener("mouseout", this.hideTooltip.bind(this));
    }
    Tooltip.elements.push(this);
  }

  hideTooltip(escapeKey) {
    if (document.activeElement == this.node && escapeKey !== true) return;
    this.tooltip.classList.add("hidden");
    this.tooltip.classList.remove("visible");
    this.tooltip.setAttribute("aria-hidden", "true");
  }
  showTooltip(event) {
    this.tooltip.classList.add("visible");
    this.tooltip.classList.remove("hidden");
    this.tooltip.setAttribute("aria-hidden", "false");
    this.tooltip.style.top = -10 - this.tooltip.offsetHeight + "px";
  }
  mouseOutHandler(event) {
    var self = this;
    var id = setTimeout(function () {
      if (self.tooltipMouseOver) {
        self.tooltipMouseOver = false;
        return;
      }
      self.hideTooltip();
    }, 1000);
  }

  static handleEscapeKey(event) {
    if (event.key == "Escape") {
      var elements = Tooltip.elements;
      for (var i = 0; i < elements.length; i++) elements[i].hideTooltip(true);
    }
  }
}

var tooltips = {};
var itemsToTip = document.querySelectorAll("[data-tooltip]");
var options = {};
//options.styleClass = "tooltip-custom-1";
//options.showOnFocus = false;
for (var i = 0; i < itemsToTip.length; i++) {
  options.styleClass = null;
  if ((i + 1) % 2 == 0) options.styleClass = "tooltip-custom-1";
  tooltips[itemsToTip[i].id] = new Tooltip(itemsToTip[i], options);
}
