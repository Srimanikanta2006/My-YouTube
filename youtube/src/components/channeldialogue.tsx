"use client";
import { useRouter } from "next/navigation";
import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import axiosInstance from "../lib/axiosinstance";
import { useUser } from "../lib/AuthContext";

const Channeldialogue = ({ isopen, onclose, channeldata, mode }: any) => {
  const { user, login, updateUserData } = useUser();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isSubmitting, setisSubmitting] = useState(false);
  useEffect(() => {
    if (channeldata && mode === "edit") {
      setFormData({
        name: channeldata.name || "",
        description: channeldata.description || "",
      });
    } else {
      setFormData({
        name: user?.name || "",
        description: "",
      });
    }
  }, [channeldata, user]);
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handlesubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      channelname: formData.name,
      description: formData.description,
    };
    if (!user) return;

    try {
      setisSubmitting(true);
      const response = await axiosInstance.patch(
        `/user/update/${user._id}`,
        payload
      );
      if (updateUserData) {
        updateUserData(response?.data);
      } else {
        login(response?.data);
      }
      router.push(`/channel/${response?.data?._id}`);
      setFormData({
        name: "",
        description: "",
      });
      onclose();
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setisSubmitting(false);
    }
  };
  return (
    <Dialog open={isopen} onOpenChange={onclose}>
      <DialogContent className="sm:max-w-md md:max-w-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-white font-bold text-xl">
            {mode === "create" ? "Create your channel" : "Edit your channel"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handlesubmit} className="space-y-6">
          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-800 dark:text-zinc-200 font-semibold">Channel Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus-visible:ring-2 focus-visible:ring-red-600"
            />
          </div>
          {/* Channel Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-800 dark:text-zinc-200 font-semibold">Channel Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Tell viewers about your channel..."
              className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus-visible:ring-2 focus-visible:ring-red-600"
            />
          </div>

          <DialogFooter className="flex justify-between sm:justify-between pt-2">
            <Button type="button" variant="outline" onClick={onclose} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-0">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl">
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                  ? "Create Channel"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Channeldialogue;
