import React, { useContext, useEffect, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import axios from "axios";
import { Navigate, useParams } from "react-router-dom";
import { UserContext } from "./UserContext.jsx";
import { toast } from "react-toastify";

const BookingWidget = ({ place }) => {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [redirect, setRedirect] = useState("");
  const { user } = useContext(UserContext);
  const{id}=useParams()
  const [checkInPtOverlapDates, setCheckInPtOverlapDates]= useState('')
  const [checkOutPtOverlapDates, setCheckOutPtOverlapDates]= useState('')


  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  //get bookings for a place and if some dates colide make a toast
  //fetch booking for place
 useEffect(()=>{
  bookinsForThatPlace()
 },[id])

 const bookinsForThatPlace=async()=>{
  const res=await axios.get(`/place/${id}`);
  const {checkIn,checkOut}=res.data[0]
  setCheckInPtOverlapDates(checkIn)
  setCheckOutPtOverlapDates(checkOut)
 }


 if ((new Date(checkIn) >= new Date(checkInPtOverlapDates) && new Date(checkIn) < new Date(checkOutPtOverlapDates)) ||
    (new Date(checkOut) > new Date(checkInPtOverlapDates) && new Date(checkOut) <= new Date(checkOutPtOverlapDates))) {
  toast.error(`From ${checkInPtOverlapDates.slice(0,10)} to ${checkOutPtOverlapDates.slice(0,10)}, the place is reserved. Select another inverval.`)
}
function checkReservation(){
  if ((new Date(checkIn) >= new Date(checkInPtOverlapDates) && new Date(checkIn) < new Date(checkOutPtOverlapDates)) ||
    (new Date(checkOut) > new Date(checkInPtOverlapDates) && new Date(checkOut) <= new Date(checkOutPtOverlapDates))){
      return false
    }
}


  //number of nights
  let numberOfNights = 0;
  if (checkIn && checkOut) {
    numberOfNights = differenceInCalendarDays(
      new Date(checkOut),
      new Date(checkIn)
    );
    if (numberOfNights<0){
      toast.error('Select a better future check out data')
    }
  }

  //so you can't choose past day compare to the present
  let presentDay = differenceInCalendarDays(new Date(checkIn), new Date());
  if (presentDay < 0) {
    toast.error("Choose at least the present day.");
  }

  if(place.maxGuests<numberOfGuests){
    toast.error(`Max number of guests chosen by the owner:${place.maxGuests} `)
  }

  //book the place
  async function bookThisPlace() {
    if (!checkIn || !checkOut || !numberOfGuests || !name || !phone) {
      toast.error("Please fill out all required fields.");
      return;
    }
    if (!user) {
      toast("Log in or register before booking!");
      setRedirect("/login");
    } else {
      const res = await axios.post("/bookings", {
        checkIn,
        checkOut,
        numberOfGuests,
        name,
        phone,
        place: place._id,
        price: numberOfNights * place.price,
      });
      const bookingId = res.data._id;
      setRedirect(`/account/bookings/${bookingId}`);
    }
  }



  if (redirect) {
    return <Navigate to={redirect} />;
  }

  return (
    <div className="bg-white shadow p-4 rounded-2xl">
      <div className="text-2xl text-center">
        Price: ${place.price} / per night
      </div>
      <div className="border rounded-2xl mt-4">
        <div className="flex">
          <div className="py-3 px-4">
            <label>Check in:</label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
            />
          </div>
          <div className="py-3 px-4 border-l">
            <label>Check out:</label>
            <input
              type="date"
              value={checkOut}
              onChange={(ev) => setCheckOut(ev.target.value)}
              required
            />
          </div>
        </div>
        <div className="py-3 px-4 border-t">
          <label>Number of guests:</label>
          <input
            type="number"
            value={numberOfGuests}
            onChange={(ev) => setNumberOfGuests(ev.target.value)}
            required
            max={place.maxGuests}
            min={1}
          />
        </div>
        {numberOfNights > 0 && (
          <div className="py-3 px-4 border-t">
            <label>Your full name:</label>
            <input
              type="text"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              required
            />
            <label>Phone number:</label>
            <input
              type="tel"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
              required
              maxLength={10}
            />
          </div>
        )}
      </div>
      {presentDay >= 0 && numberOfGuests<=place.maxGuests && (
        <button onClick={bookThisPlace} className="primary mt-4">
          Book this place
          {numberOfNights > 0 && <span> ${numberOfNights * place.price}</span>}
        </button>
      )}
    </div>
  );
};

export default BookingWidget;
