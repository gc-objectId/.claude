import type { Meta, StoryObj } from "@storybook/react-vite";

import { DosingFormBanner } from "./DosingFormBanner";
import { PromptTypeEnum } from "../../types/PromptType"; //👇 This default export determines where your story goes in the story list
import { RuleID } from "../../types/identifiers";

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof DosingFormBanner> = {
  component: DosingFormBanner,
};

export default meta;

type Story = StoryObj<typeof DosingFormBanner>;

const sampleRuleId = RuleID.check("i-latest-medication");

export const Info: Story = {
  args: {
    content: "foo",
    type: PromptTypeEnum.INFO,
  },
};

export const Warning: Story = {
  args: {
    content: "foo",
    type: PromptTypeEnum.WARNING,
  },
};

export const WarningWithCitation: Story = {
  args: {
    ...Warning.args,
    content: "Hello, I am a warning.",

    citations: [
      {
        id: "r-foo",
        citation: "9/10 doctors recommend!",
        url: "http://foo.com",
        label: "foo!",
      },
      {
        id: "r-bar",
        citation: "This is a citation",
        url: "http://bar.com",
        label: "bar!",
      },
    ],
  },
};

export const MultiLineWarningWithCitations: Story = {
  args: {
    ...Warning.args,
    content: "foo <br/> bar <br/> baz",
    citations: [
      {
        id: "r-foo",
        citation: "9/10 doctors recommend!",
        url: "http://foo.com",
        label: "foo!",
      },
      {
        id: "r-bar",
        citation: "This is a citation",
        url: "http://bar.com",
        label: "bar!",
      },
    ],
  },
};

export const WarningWithInlineCitation: Story = {
  args: {
    ...Warning.args,
    content:
      "foo <br/> the citation tooltip <i>should</i> be on the next line <br/> -----> <Citation></Citation> <-----",
    citations: [
      {
        id: "r-foo",
        citation: "9/10 doctors recommend!",
        url: "http://foo.com",
        label: "foo!",
      },
      {
        id: "r-bar",
        citation: "This is a citation",
        url: "http://bar.com",
        label: "bar!",
      },
    ],
  },
};

export const LASTWarning: Story = {
  args: {
    ...Warning.args,
    citations: [
      {
        id: "r-foo",
        label: "UptoDate",
        citation: "max dose = 4.5 mg/kg x 52.4 kg",
        url: "https://www.uptodate.com/contents/image?csi=1f7b1aea-0cbf-44f1-8ad0-52108e116e08&source=contentShare&imageKey=ANEST%2F93203",
      },
    ],

    content: `<b>Max dose is 235 mg (47 mL).</b> Adjust for:
                <Citation></Citation><span class='w-last-local-anesthetic-warning-data'><ul class='administration-list'><li>
                 <span class='name'>Bupivacaine 0.25%</span>
                 <span class='dose-route'><span class='dose'>12 mg</span> <span class='route'>Epidural</span></span>
                 <span class='time'>at 09/21/2023 09:53</span>
                </li>
                <li>
                 <span class='name'>Ropivacaine 0.2%</span>
                 <span class='dose-route'><span class='dose'>20 mg</span> <span class='route'>Epidural</span></span>
                 <span class='time'>at 09/21/2023 09:53</span>
                </li>
                </ul></span>`,
  },
};

// OR-1847: Antibiotic table stories for testing condensed spacing
export const AntibioticInfoBanner: Story = {
  args: {
    type: PromptTypeEnum.INFO,
    ruleId: sampleRuleId,
    content: `Prior antibiotic administrations:
                <span class='i-latest-medication-data'>
                  <table class='administration-table'>
                    <tbody>
                      <tr>
                        <td class='name'>Cefazolin</td>
                        <td class='dose-route'>2000 mg IV</td>
                        <td class='time'>at 09/21/2023 09:15</td>
                      </tr>
                      <tr>
                        <td class='name'>Vancomycin</td>
                        <td class='dose-route'>1500 mg IV</td>
                        <td class='time'>at 09/21/2023 08:30</td>
                      </tr>
                    </tbody>
                  </table>
                </span>`,
    citations: [],
  },
};

export const AntibioticWarningBanner: Story = {
  args: {
    type: PromptTypeEnum.WARNING,
    ruleId: sampleRuleId,
    content: `Consider prior antibiotic administrations:
                <span class='i-latest-medication-data'>
                  <table class='administration-table'>
                    <tbody>
                      <tr>
                        <td class='name'>Ceftriaxone</td>
                        <td class='dose-route'>1000 mg IV</td>
                        <td class='time'>at 09/21/2023 10:45</td>
                      </tr>
                    </tbody>
                  </table>
                </span>`,
    citations: [
      {
        id: "r-antibiotic",
        label: "Clinical Guidelines",
        citation: "Antibiotic redosing recommended every 4 hours",
        url: "https://example.com",
      },
    ],
  },
};

export const AntibioticMultipleItems: Story = {
  args: {
    type: PromptTypeEnum.INFO,
    ruleId: sampleRuleId,
    content: `Prior antibiotic administrations:
                <span class='i-latest-medication-data'>
                  <table class='administration-table'>
                    <tbody>
                      <tr>
                        <td class='name'>Cefazolin</td>
                        <td class='dose-route'>2000 mg IV</td>
                        <td class='time'>at 09/21/2023 09:15</td>
                      </tr>
                      <tr>
                        <td class='name'>Vancomycin</td>
                        <td class='dose-route'>1500 mg IV</td>
                        <td class='time'>at 09/21/2023 08:30</td>
                      </tr>
                      <tr>
                        <td class='name'>Gentamicin</td>
                        <td class='dose-route'>240 mg IV</td>
                        <td class='time'>at 09/21/2023 08:15</td>
                      </tr>
                      <tr>
                        <td class='name'>Metronidazole</td>
                        <td class='dose-route'>500 mg IV</td>
                        <td class='time'>at 09/21/2023 07:45</td>
                      </tr>
                    </tbody>
                  </table>
                </span>`,
    citations: [],
  },
};

export const AntibioticLongNames: Story = {
  args: {
    type: PromptTypeEnum.INFO,
    ruleId: sampleRuleId,
    content: `Prior antibiotic administrations:
                <span class='i-latest-medication-data'>
                  <table class='administration-table'>
                    <tbody>
                      <tr>
                        <td class='name'>Piperacillin-Tazobactam</td>
                        <td class='dose-route'>3375 mg IV</td>
                        <td class='time'>at 09/21/2023 11:30</td>
                      </tr>
                      <tr>
                        <td class='name'>Ampicillin-Sulbactam</td>
                        <td class='dose-route'>3000 mg IV</td>
                        <td class='time'>at 09/21/2023 10:15</td>
                      </tr>
                      <tr>
                        <td class='name'>Trimethoprim-Sulfamethoxazole</td>
                        <td class='dose-route'>800 mg IV</td>
                        <td class='time'>at 09/21/2023 09:00</td>
                      </tr>
                    </tbody>
                  </table>
                </span>`,
    citations: [],
  },
};

export const AntibioticMinimalSpacing: Story = {
  args: {
    type: PromptTypeEnum.INFO,
    ruleId: sampleRuleId,
    content: `Prior antibiotic administrations:
                <span class='i-latest-medication-data'>
                  <table class='administration-table'>
                    <tbody>
                      <tr>
                        <td class='name'>Ancef</td>
                        <td class='dose-route'>2 g IV</td>
                        <td class='time'>at 09/21/2023 12:00</td>
                      </tr>
                      <tr>
                        <td class='name'>Cipro</td>
                        <td class='dose-route'>400 mg IV</td>
                        <td class='time'>at 09/21/2023 11:45</td>
                      </tr>
                    </tbody>
                  </table>
                </span>`,
    citations: [],
  },
};
