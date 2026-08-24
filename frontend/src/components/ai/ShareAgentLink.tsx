import { useState } from "react";
import { Check, Copy, Link2, RefreshCw, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { newId } from "@/src/lib/format";

const newToken = () => newId("").replace(/^-/, "");

interface ShareAgentLinkProps {
  vehicleNickname: string;
}

/**
 * Generates a GUID-backed link a mechanic can open to chat with the vehicle's
 * agent. A recipient is required first so the resulting conversation can be
 * attributed in the history grid.
 */
const ShareAgentLink = ({ vehicleNickname }: ShareAgentLinkProps) => {
  const [recipient, setRecipient] = useState("");
  const [share, setShare] = useState<{ name: string; token: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const trimmedRecipient = recipient.trim();

  const generate = () => {
    if (!trimmedRecipient) return;
    setShare({ name: trimmedRecipient, token: newToken() });
    setCopied(false);
  };

  const copy = async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/agent/${share.token}`
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Popover onOpenChange={() => setCopied(false)}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <Link2 />
        Share agent link
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <PopoverHeader>
          <PopoverTitle>Share your car's agent</PopoverTitle>
          <PopoverDescription>
            Anyone with the link can chat with the CarPilot agent about{" "}
            {vehicleNickname}. Say who it's for so the conversation shows up in
            your history under their name.
          </PopoverDescription>
        </PopoverHeader>

        {share ? (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-500">Link for</Label>
                <Badge className="bg-blue-50 text-blue-700">{share.name}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/agent/${share.token}`}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copy link"
                  onClick={copy}
                >
                  {copied ? <Check className="text-emerald-600" /> : <Copy />}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500"
                onClick={generate}
              >
                <RefreshCw />
                New link
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500"
                onClick={() => {
                  setShare(null);
                  setRecipient("");
                  setCopied(false);
                }}
              >
                <UserPlus />
                Share with someone else
              </Button>
            </div>
          </>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              generate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="share-recipient">Who are you sending this to?</Label>
              <Input
                id="share-recipient"
                autoFocus
                placeholder="Vasquez Auto Repair"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!trimmedRecipient}>
              <Link2 />
              Generate link
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ShareAgentLink;
