import { ModeButtonDefinition } from "@opentripplanner/types";
import { Bicycle, Bus, Car, PersonWalking } from "@styled-icons/fa-solid";
import React, { ReactElement } from "react";
import { QueryParamProvider } from "use-query-params";
import { WindowHistoryAdapter } from "use-query-params/adapters/window";
import * as Core from "..";
import { QueryParamChangeEvent } from "../types";

import modeSettingDefinitions from "../../modeSettings.yml";

const defaultModeButtonDefinitions = [
  {
    Icon: Bus,
    iconName: "bus",
    key: "TRANSIT",
    modes: [{ mode: "TRANSIT" }]
  },
  {
    Icon: PersonWalking,
    iconName: "person-walking",
    key: "WALK",
    modes: [{ mode: "WALK" }]
  },
  {
    Icon: Bicycle,
    iconName: "bicycle",
    key: "BICYCLE",
    modes: [{ mode: "BICYCLE" }]
  },
  {
    Icon: Car,
    iconName: "car",
    key: "CAR",
    modes: [{ mode: "CAR" }]
  }
];

const modeSettingDefinitionsWithDropdown = [
  ...modeSettingDefinitions,
  {
    applicableMode: "TRANSIT",
    type: "DROPDOWN",
    key: "busColor",
    default: "blue",
    options: [{ value: "blue" }]
  }
];

const MetroModeSelectorComponent = ({
  disableHover,
  fillModeIcons,
  modeButtonDefinitions,
  onSetModeSettingValue,
  onToggleModeButton
}: {
  disableHover?: boolean;
  fillModeIcons?: boolean;
  modeButtonDefinitions: ModeButtonDefinition[];
  onSetModeSettingValue: (event: QueryParamChangeEvent) => void;
  onToggleModeButton: (key: string) => void;
}): ReactElement => {
  const initialState = {
    enabledModeButtons: ["TRANSIT"],
    modeSettingValues: {}
  };
  const {
    buttonsWithSettings,
    setModeSettingValue,
    toggleModeButton
  } = Core.useModeState(
    modeButtonDefinitions,
    initialState,
    modeSettingDefinitionsWithDropdown,
    {
      queryParamState: false
    }
  );

  const toggleModeButtonAction = (key: string) => {
    toggleModeButton(key);
    onToggleModeButton(key);
  };

  const setModeSettingValueAction = (event: QueryParamChangeEvent) => {
    setModeSettingValue(event);
    onSetModeSettingValue(event);
  };

  return (
    <div style={{ position: "relative", width: "340px" }}>
      <Core.MetroModeSelector
        onToggleModeButton={toggleModeButtonAction}
        modeButtons={buttonsWithSettings}
        onSettingsUpdate={setModeSettingValueAction}
        fillModeIcons={fillModeIcons}
        disableHover={disableHover}
      />
    </div>
  );
};

const Template = (args: {
  disableHover?: boolean;
  fillModeIcons?: boolean;
  onSetModeSettingValue: (event: QueryParamChangeEvent) => void;
  onToggleModeButton: (key: string) => void;
}): ReactElement => (
  <QueryParamProvider adapter={WindowHistoryAdapter}>
    <MetroModeSelectorComponent
      modeButtonDefinitions={defaultModeButtonDefinitions}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...args}
    />
  </QueryParamProvider>
);

export default {
  component: MetroModeSelectorComponent,
  title: "Trip Form Components/Metro Mode Selector",
  argTypes: {
    disableHover: { control: "boolean" },
    fillModeIcons: { control: "boolean" },
    onToggleModeButton: { action: "toggle button" },
    onSetModeSettingValue: { action: "set mode setting value" }
  }
};

export const MetroModeSelector = Template.bind({});