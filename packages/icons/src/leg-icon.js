import { legType } from "@opentripplanner/core-utils/lib/types";
import { getCompanyFromLeg } from "@opentripplanner/core-utils/lib/itinerary";
import PropTypes from "prop-types";
import React from "react";

import { getCompanyIcon as defaultGetCompanyIcon } from "./companies";

const LegIcon = ({ getCompanyIcon, leg, ModeIcon, ...props }) => {
  const company = getCompanyFromLeg(leg);
  // Check if the iconStr has a matching company icon. If so, return that.
  if (company && typeof getCompanyIcon === "function") {
    const CompanyIcon = getCompanyIcon(company);
    if (CompanyIcon) return <CompanyIcon {...props} />;
  }
  let iconStr = leg.mode;
  // Do this for P&R, K&R and TNC trips without company icon
  if (iconStr && iconStr.startsWith("CAR")) iconStr = "CAR";

  return <ModeIcon mode={iconStr} {...props} />;
};

LegIcon.propTypes = {
  // Optional override function for deriving the company icon for a given leg.
  getCompanyIcon: PropTypes.func,
  leg: legType.isRequired,
  ModeIcon: PropTypes.elementType.isRequired
};

LegIcon.defaultProps = {
  getCompanyIcon: defaultGetCompanyIcon
};

export default LegIcon;
